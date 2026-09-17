import os
import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from services.llm_client import LLMClient

logger = logging.getLogger(__name__)

class ProjectSpec(BaseModel):
    id: str = Field(description="Unique kebab-case project identifier (e.g. 'ai-lead-qualifier')")
    title: str = Field(description="Industry-grade project title")
    track: str = Field(description="Target role track: 'pm', 'ai', or 'fo'")
    difficulty: str = Field(description="Difficulty level: 'Beginner', 'Intermediate', or 'Advanced'")
    estimated_days: int = Field(description="Realistic timeframe to build (e.g., 2, 3, 5)")
    summary: str = Field(description="1-2 sentences explaining what business problem this project solves")
    business_impact: str = Field(description="Why seed/Series A founders care about this exact skill")
    tech_stack: List[str] = Field(description="Modern tools/frameworks (e.g. ['FastAPI', 'Groq', 'SQLite', 'Docker'])")
    key_deliverables: List[str] = Field(description="Concrete artifacts the student must push to GitHub or portfolio")
    github_readme_template: str = Field(description="Structured markdown outline for the GitHub repo README")

class ProjectRecommendationResponse(BaseModel):
    recommended_projects: List[ProjectSpec]

class ResumeSkillAnalysis(BaseModel):
    overall_match_score: int = Field(description="Match percentage between 0 and 100")
    target_track: str = Field(description="'pm', 'ai', or 'fo'")
    candidate_strengths: List[str] = Field(description="Key strengths identified in the candidate's resume/profile")
    skill_gaps: List[str] = Field(description="Critical industry skills missing for early-stage startup hiring")
    missing_keywords: List[str] = Field(description="High-frequency ATS keywords that should be added")
    recommended_project_id: str = Field(description="ID of the specific project that directly closes their primary skill gap")
    immediate_action_items: List[str] = Field(description="3 clear bullet points on how to upgrade their resume this week")

# Pre-curated, industry-standard flagship projects that founders actually respect
CURATED_PROJECTS: List[Dict[str, Any]] = [
    {
        "id": "event-driven-ai-pipeline",
        "title": "Autonomous Inbound Lead Enrichment & Qualification Engine",
        "track": "ai",
        "difficulty": "Intermediate",
        "estimated_days": 3,
        "summary": "Build an asynchronous worker pipeline that intercepts incoming startup inquiries, searches live company intelligence via Serper, generates structured VC evaluation profiles using Groq, and stores normalized records in SQLite.",
        "business_impact": "Founders spend 10+ hours a week vetting leads manually. Showing a working ingestion & enrichment pipeline proves you can build real autonomous AI features on day 1.",
        "tech_stack": ["Python", "FastAPI", "Groq (llama-3.3/gpt-oss)", "SQLite", "Pydantic", "Docker"],
        "key_deliverables": [
            "Async ingestion endpoint with Pydantic v2 validation",
            "Rate-limited LLM worker with automatic provider failover (Groq -> Gemini)",
            "SQLAlchemy schema with automated migration script",
            "Full GitHub repo with Dockerfile, pytest test suite, and clean architecture diagram"
        ],
        "github_readme_template": "# Autonomous Lead Enrichment Engine\n\n## Overview\nProduction-ready event-driven pipeline that automates founder research using Groq 120B and Serper Google SERP.\n\n## Architecture\n- **Ingestion**: FastAPI REST API\n- **Worker**: Asynchronous task processor\n- **Database**: SQLite / PostgreSQL with SQLAlchemy ORM\n\n## Setup & Run\n```bash\ndocker-compose up --build\n```"
    },
    {
        "id": "quick-commerce-returns-prd",
        "title": "PRD & Product Strategy: 10-Minute Return Logistics for Quick Commerce",
        "track": "pm",
        "difficulty": "Intermediate",
        "estimated_days": 2,
        "summary": "Author an exhaustive Product Requirement Document (PRD) for an instant return/exchange feature for a quick-commerce app (e.g. Zepto/Blinkit), complete with edge-case flows and metric trees.",
        "business_impact": "Founders look for PM interns who think in systems, edge-cases, and unit economics—not just wireframes. A thorough PRD proves you understand product delivery from day one.",
        "tech_stack": ["Notion / Markdown", "Figma (Wireframes)", "Whimsical / Mermaid (User Flow)", "Amplitude / PostHog Mock Metric Spec"],
        "key_deliverables": [
            "Comprehensive 6-page PRD document (Problem, Target User, Scope, Non-Goals)",
            "Step-by-step user journey map + edge case failure handling matrix",
            "Metric hierarchy: North Star, L1 (Operational fulfillment speed), L2 (Return fraud rate)",
            "Go-To-Market (GTM) phased rollout plan across 3 pilot dark stores"
        ],
        "github_readme_template": "# Quick-Commerce 10-Min Returns PRD\n\n## Executive Summary\nSolving the high return friction in 10-minute grocery delivery while safeguarding unit economics.\n\n## Contents\n1. Market & User Research\n2. Product Specification\n3. Edge Cases & Fraud Mitigation\n4. Success Metrics Tree"
    },
    {
        "id": "founders-office-growth-audit",
        "title": "Seed-Stage CAC & Unit Economics Diagnostic Playbook",
        "track": "fo",
        "difficulty": "Intermediate",
        "estimated_days": 2,
        "summary": "Develop a multi-channel financial model and growth audit analyzing Customer Acquisition Cost (CAC), payback periods, and churn across 3 hypothetical go-to-market channels for a B2B SaaS startup.",
        "business_impact": "Founders' Office interns act as extensions of the CEO. Demonstrating financial literacy and analytical rigor makes you an instant top 1% applicant.",
        "tech_stack": ["Google Sheets / Excel Model", "Notion Executive Memo", "Python (Pandas for Cohort Analysis)"],
        "key_deliverables": [
            "Dynamic financial sensitivity model (3-year revenue projection + burn multiple)",
            "Cohort retention heatmap and churn calculation workbook",
            "1-page Executive Memo synthesizing strategic recommendations for the founder",
            "Competitive positioning teardown against top 2 market incumbents"
        ],
        "github_readme_template": "# B2B SaaS Unit Economics & Growth Diagnostic\n\n## Overview\nComplete Founder's Office financial model evaluating payback periods and channel CAC efficiency.\n\n## Deliverables\n- Financial Model (`.xlsx`)\n- Executive Strategy Memo (`memo.md`)\n- Cohort Retention Script (`retention.py`)"
    },
    {
        "id": "rag-customer-support-agent",
        "title": "Production RAG Agent with Hybrid Keyword + Semantic Search",
        "track": "ai",
        "difficulty": "Advanced",
        "estimated_days": 4,
        "summary": "Engineer a low-latency Customer Support RAG system that combines BM25 keyword search with dense vector embeddings to minimize hallucinations and deliver cited answers in under 800ms.",
        "business_impact": "Almost every high-growth startup is building RAG. Showing you understand hybrid search and citation evaluation sets you far apart from candidates who only know simple langchain wrappers.",
        "tech_stack": ["Python", "Groq / OpenAI API", "ChromaDB / Qdrant", "FastAPI", "Docker"],
        "key_deliverables": [
            "Hybrid search retrieval combining reciprocal rank fusion (RRF)",
            "Grounding evaluator that verifies answer provenance against retrieved chunks",
            "FastAPI endpoint with streaming SSE responses (<800ms time-to-first-token)",
            "Benchmarking script evaluating retrieval precision & recall"
        ],
        "github_readme_template": "# Hybrid RAG Support Agent\n\n## Highlights\n- BM25 + Dense Vector Hybrid Search with RRF\n- Zero-hallucination citation guardrail\n- Dockerized deployment ready for staging"
    }
]

class ProjectRecommenderService:
    def __init__(self):
        try:
            self.llm = LLMClient()
        except Exception:
            self.llm = None

    def get_curated_projects(self, track: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns the flagship industry project catalog, optionally filtered by role track."""
        if not track or track.lower() == "all":
            return CURATED_PROJECTS
        clean_track = track.lower().strip()
        return [p for p in CURATED_PROJECTS if p["track"] == clean_track]

    def analyze_resume_and_match(
        self,
        resume_text: str,
        target_track: str = "ai"
    ) -> ResumeSkillAnalysis:
        """
        Evaluates a candidate's resume text against real Indian startup hiring requirements.
        Identifies skill gaps and matches them with a specific project to close the gap.
        """
        track_names = {
            "ai": "AI Automation & Backend Engineering",
            "pm": "Product Management & Strategy",
            "fo": "Founder's Office & Growth Operations"
        }
        role_label = track_names.get(target_track.lower(), "Early-Stage Startup Generalist")

        # Fallback if no LLM client is available
        if not self.llm or not self.llm.groq_key:
            return ResumeSkillAnalysis(
                overall_match_score=72,
                target_track=target_track,
                candidate_strengths=["Foundational programming knowledge", "Eager to learn"],
                skill_gaps=["Production system design", "API integration experience"],
                missing_keywords=["FastAPI", "Groq", "Docker", "Async IO"],
                recommended_project_id="event-driven-ai-pipeline" if target_track == "ai" else "quick-commerce-returns-prd",
                immediate_action_items=[
                    "Add measurable metrics to past project descriptions (e.g. '% reduction in latency').",
                    "Deploy your top project to a live public URL (Vercel/Render).",
                    "Include a clean GitHub repo link with a comprehensive README."
                ]
            )

        prompt = (
            f"You are a Senior Hiring Partner at a top venture capital fund evaluating candidates (0-2 years experience) "
            f"for high-impact roles at newly funded Indian startups.\n\n"
            f"TARGET TRACK: {role_label} ({target_track.upper()})\n\n"
            f"CANDIDATE RESUME / EXPERIENCE TEXT:\n"
            f"\"\"\"\n{resume_text[:4000]}\n\"\"\"\n\n"
            f"AVAILABLE PROJECT CATALOG TO RECOMMEND:\n"
            f"{json.dumps([{ 'id': p['id'], 'title': p['title'], 'track': p['track'] } for p in CURATED_PROJECTS], indent=2)}\n\n"
            f"YOUR TASK:\n"
            f"1. Score the resume match from 0-100 based on realistic seed/Series A startup expectations.\n"
            f"2. Identify 3 specific strengths.\n"
            f"3. Identify 2-3 genuine skill gaps that would prevent this candidate from clearing a startup technical/case interview.\n"
            f"4. List 4 high-impact keywords they are missing.\n"
            f"5. Select the single best project ID from the catalog that directly closes their biggest gap.\n"
            f"6. Provide 3 immediate, high-converting bullet points they should implement this week."
        )

        try:
            analysis = self.llm.generate_json(
                prompt=prompt,
                response_model=ResumeSkillAnalysis,
                system="You are an expert venture recruiter that gives candid, high-value resume and portfolio advice."
            )
            if analysis:
                return analysis
        except Exception as e:
            logger.error(f"[ProjectRecommender] Resume analysis failed: {e}")

        # Fallback response
        return ResumeSkillAnalysis(
            overall_match_score=75,
            target_track=target_track,
            candidate_strengths=["Relevant academic background", "Foundational concepts in place"],
            skill_gaps=["Proof of production-grade work", "Experience with modern AI toolchains"],
            missing_keywords=["Pydantic", "Groq", "RESTful APIs", "FastAPI"],
            recommended_project_id="event-driven-ai-pipeline",
            immediate_action_items=[
                "Build and deploy a proof-of-work project to demonstrate applied execution.",
                "Quantify your accomplishments on your resume using the Google X-Y-Z formula.",
                "Add active links to your GitHub and live demos in your header."
            ]
        )
