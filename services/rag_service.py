import os
import logging
from typing import List, Dict, Any
from collections import defaultdict
from google import genai
from db.connection import SessionLocal
from db.models import Startup, LeadProfile

logger = logging.getLogger(__name__)

class RAGService:
    """
    Retrieval-Augmented Generation (RAG) Service.
    Indexes startups and leads into ChromaDB using Gemini API embeddings (gemini-embedding-001).
    Lightweight 0-RAM footprint for cloud server environments.
    """
    def __init__(self, db_path: str = "./chroma_db"):
        self.gemini_key = os.getenv("GEMINI_API_KEY")
        self.groq_key = os.getenv("GROQ_API_KEY")
        self.gemini_model = os.getenv("RAG_LLM_MODEL", "gemini-3.6-flash")
        
        # Initialize persistent ChromaDB client without heavy ONNX local models
        try:
            import chromadb
            self.chroma_client = chromadb.PersistentClient(path=db_path)
            self.startups_collection = self.chroma_client.get_or_create_collection(
                name="startups_v3",
                metadata={"hnsw:space": "cosine"}
            )
        except ImportError:
            logger.warning("[RAG] chromadb package is not installed. RAG persistent vector index disabled.")
            self.chroma_client = None
            self.startups_collection = None

    def _get_embedding(self, text: str) -> List[float]:
        """Generate text embedding via Gemini gemini-embedding-001 API with rate limit handling."""
        if not text or not text.strip():
            return [0.0] * 768

        if self.gemini_key:
            import time
            for attempt in range(3):
                try:
                    client = genai.Client(api_key=self.gemini_key)
                    res = client.models.embed_content(
                        model="gemini-embedding-001",
                        contents=text
                    )
                    if hasattr(res, "embedding") and res.embedding:
                        return res.embedding.values
                    elif hasattr(res, "embeddings") and res.embeddings and len(res.embeddings) > 0:
                        return res.embeddings[0].values
                except Exception as e:
                    if "429" in str(e) and attempt < 2:
                        time.sleep(2 ** (attempt + 1))
                    else:
                        logger.warning(f"[RAG] Gemini embedding API call failed: {e}")
                        break

        # Fallback deterministic vector (768-dimensional to match gemini-embedding-001)
        import hashlib
        h = hashlib.sha256(text.encode("utf-8")).digest()
        vector = []
        for i in range(24):
            for byte in h:
                vector.append(float(byte) / 255.0)
        return vector[:768]

    def index_all(self) -> int:
        """
        Indexes all startups and lead profiles from SQLite into ChromaDB using API embeddings.
        """
        if not self.startups_collection:
            logger.warning("[RAG] Cannot index: ChromaDB startups_collection is not initialized.")
            return 0

        logger.info("[RAG] Indexing startups into ChromaDB using Gemini API embeddings...")
        with SessionLocal() as db:
            startups = db.query(Startup).all()
            if not startups:
                logger.info("[RAG] No startups found to index.")
                return 0

            all_leads = db.query(LeadProfile).all()
            leads_by_startup = defaultdict(list)
            for l in all_leads:
                if l.startup_id:
                    leads_by_startup[l.startup_id].append(l)

            ids = []
            documents = []
            metadatas = []
            embeddings = []

            for s in startups:
                doc_id = f"startup_{s.id}"
                
                investors_str = ", ".join(s.investors) if isinstance(s.investors, list) else str(s.investors or "")
                
                doc_text = (
                    f"Startup Name: {s.name}\n"
                    f"Industry/Sector: {s.industry or 'N/A'}\n"
                    f"Headquarters: {s.hq or 'N/A'}\n"
                    f"Funding Round: {s.funding_round or 'N/A'}\n"
                    f"Funding Amount: {s.funding_amount or 'N/A'}\n"
                    f"Investors: {investors_str}\n"
                    f"Website: {s.website or 'N/A'}\n"
                    f"Source: {s.source or 'N/A'}\n"
                )

                leads = leads_by_startup.get(s.id, [])
                if leads:
                    lead_texts = [f"{l.name} ({l.role}) - {l.linkedin_url}" for l in leads]
                    doc_text += "Key Personnel / Leads: " + "; ".join(lead_texts) + "\n"

                emb = self._get_embedding(doc_text)

                ids.append(doc_id)
                documents.append(doc_text)
                metadatas.append({
                    "startup_id": s.id,
                    "name": s.name or "",
                    "industry": s.industry or "",
                    "funding_amount": s.funding_amount or "",
                    "funding_round": s.funding_round or "",
                    "website": s.website or ""
                })
                embeddings.append(emb)

            if ids:
                batch_size = 50
                for i in range(0, len(ids), batch_size):
                    self.startups_collection.upsert(
                        ids=ids[i:i+batch_size],
                        documents=documents[i:i+batch_size],
                        embeddings=embeddings[i:i+batch_size],
                        metadatas=metadatas[i:i+batch_size]
                    )
                logger.info(f"[RAG] Successfully indexed {len(ids)} startup document(s) into ChromaDB.")
                return len(ids)
        return 0

    def _get_sqlite_startup_count(self) -> int:
        """Returns the current number of startups in SQLite."""
        try:
            with SessionLocal() as db:
                return db.query(Startup).count()
        except Exception:
            return 0

    def query_similar_startups(self, query_text: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Perform vector similarity search in ChromaDB using Gemini API embedding."""
        if not self.startups_collection:
            logger.warning("[RAG] ChromaDB startups_collection is not initialized.")
            return []

        try:
            emb = self._get_embedding(query_text)
            results = self.startups_collection.query(
                query_embeddings=[emb],
                n_results=min(top_k, self.startups_collection.count())
            )

            output = []
            if results and results.get("documents"):
                docs = results["documents"][0]
                metas = results["metadatas"][0]
                distances = results.get("distances", [[]])[0]

                for i in range(len(docs)):
                    output.append({
                        "document": docs[i],
                        "metadata": metas[i],
                        "score": round(1.0 - distances[i], 3) if i < len(distances) else 0.0
                    })
            if output:
                return output
        except Exception as e:
            logger.warning(f"[RAG] Vector query failed: {e}. Falling back to SQLite search.")

        # Fallback to direct SQLite search if vector search returns empty or fails
        return self._search_sqlite_fallback(query_text, top_k=top_k)

    def _search_sqlite_fallback(self, query_text: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """Fallback search querying SQLite directly using keywords."""
        from sqlalchemy import or_
        keywords = [w.strip() for w in query_text.split() if len(w.strip()) > 2]
        output = []
        with SessionLocal() as db:
            query = db.query(Startup)
            if keywords:
                filters = []
                for kw in keywords[:3]:
                    filters.append(Startup.name.ilike(f"%{kw}%"))
                    filters.append(Startup.industry.ilike(f"%{kw}%"))
                    filters.append(Startup.funding_round.ilike(f"%{kw}%"))
                query = query.filter(or_(*filters))
            
            startups = query.limit(top_k).all()
            for s in startups:
                investors_str = ", ".join(s.investors) if isinstance(s.investors, list) else str(s.investors or "")
                doc_text = (
                    f"Startup Name: {s.name}\n"
                    f"Industry: {s.industry or 'N/A'}\n"
                    f"Funding Round: {s.funding_round or 'N/A'}\n"
                    f"Funding Amount: {s.funding_amount or 'N/A'}\n"
                    f"Investors: {investors_str}\n"
                    f"Website: {s.website or 'N/A'}\n"
                )
                output.append({
                    "document": doc_text,
                    "metadata": {"startup_id": s.id, "name": s.name or "", "industry": s.industry or ""},
                    "score": 0.5
                })
        return output

    def answer_question(self, query_text: str) -> str:
        """
        Executes full RAG workflow:
          1. Vector search ChromaDB for top-5 matching startups (with SQLite fallback).
          2. Constructs augmented prompt with contexts.
          3. Generates grounded answer using Groq llama-3.3-70b.
        """
        logger.info(f"[RAG] Processing question: '{query_text}'")
        retrieved = self.query_similar_startups(query_text, top_k=5)

        if not retrieved:
            retrieved = self._search_sqlite_fallback(query_text, top_k=5)

        if not retrieved:
            return "No matching startup data found in the knowledge base."

        context_str = "\n\n---\n\n".join([item["document"] for item in retrieved])

        prompt = (
            f"You are an AI Product Manager and VC Research Assistant specializing in Indian startups.\n"
            f"Answer the user's question using ONLY the retrieved startup database context below.\n\n"
            f"Rules:\n"
            f"- Provide a clear, structured Markdown response.\n"
            f"- Highlight startup names, funding amounts, rounds, investors, and website links in bullet points.\n"
            f"- Be precise and factual. Do not invent details not present in the context.\n\n"
            f"Retrieved Startup Database Context:\n"
            f"{context_str}\n\n"
            f"User Question: {query_text}"
        )

        # Groq primary for answer generation (14,400 RPD, no quota issues)
        if self.groq_key:
            try:
                from services.llm_client import LLMClient
                llm = LLMClient()
                return llm.generate(
                    prompt=prompt,
                    system="You are an AI Product Manager and VC Research Assistant specializing in Indian startups. Answer using only the provided context.",
                )
            except Exception as e:
                logger.warning(f"[RAG] Groq generation failed: {e}. Falling back to Gemini...")

        # Gemini fallback for answer generation
        if self.gemini_key:
            try:
                client = genai.Client(api_key=self.gemini_key)
                response = client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                logger.error(f"[RAG] Gemini generation failed: {e}")

        return f"### Retrieved Startup Information\n\n{context_str}"
