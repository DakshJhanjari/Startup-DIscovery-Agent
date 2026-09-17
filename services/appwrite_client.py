"""
appwrite_client.py
==================
Thin wrapper around the Appwrite Python SDK (v1.8+) for the Intern Hunt pipeline.
All writes are best-effort: failures are logged but do NOT crash the pipeline.
Deduplication: upsert by startup name / linkedin_url.

SDK v1.8 Note:
  - create_document / list_documents / update_document still work but emit DeprecationWarnings
  - Return type is appwrite.models.document.Document (Pydantic model)
  - doc.id  => the document ID (NOT doc["$id"])
  - doc.data => dict of the document fields
  - list response: res.documents => list of Document objects
"""

import os, logging, time, gc, warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="appwrite")

from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
load_dotenv()

from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from appwrite.id import ID
from appwrite.exception import AppwriteException

logger = logging.getLogger(__name__)

ENDPOINT   = os.getenv("NEXT_PUBLIC_APPWRITE_ENDPOINT", "https://sgp.cloud.appwrite.io/v1")
PROJECT_ID = os.getenv("NEXT_PUBLIC_APPWRITE_PROJECT_ID", "6a909f2d001e307f0ef3")
API_KEY    = os.getenv("APPWRITE_API_KEY", "")
DB_ID      = os.getenv("APPWRITE_DATABASE_ID", "intern_hunt_db")


def _doc_id(doc) -> Optional[str]:
    """Extract document ID from Appwrite Document model or dict."""
    if doc is None:
        return None
    if hasattr(doc, "id"):
        return doc.id
    if isinstance(doc, dict):
        return doc.get("$id") or doc.get("id")
    return None


def _doc_list(res) -> list:
    """Extract list of Document objects from an Appwrite list response."""
    if res is None:
        return []
    if hasattr(res, "documents"):
        return list(res.documents)
    if isinstance(res, dict):
        return res.get("documents", [])
    return []


def _doc_to_dict(doc) -> Dict:
    """Convert Document model to a plain dict including its data fields."""
    if doc is None:
        return {}
    if isinstance(doc, dict):
        return doc
    base = {"id": _doc_id(doc)}
    if hasattr(doc, "data") and doc.data:
        base.update(doc.data)
    return base


class AppwriteClient:
    def __init__(self):
        if not API_KEY:
            logger.warning("APPWRITE_API_KEY not set -- Appwrite sync skipped.")
            self._enabled = False
            return
        client = Client()
        client.set_endpoint(ENDPOINT).set_project(PROJECT_ID).set_key(API_KEY)
        self.db = Databases(client)
        self._enabled = True
        logger.info("AppwriteClient init OK (project=%s, db=%s)", PROJECT_ID, DB_ID)

    def _find_one(self, collection: str, queries: list) -> Optional[Any]:
        try:
            res = self.db.list_documents(DB_ID, collection, queries=[*queries, Query.limit(1)])
            docs = _doc_list(res)
            return docs[0] if docs else None
        except AppwriteException as e:
            logger.debug("_find_one %s: %s", collection, e)
            return None

    def _safe(self, fn, *args, label="", **kwargs):
        try:
            return fn(*args, **kwargs)
        except AppwriteException as e:
            logger.warning("Appwrite [%s]: %s", label, str(e)[:120])
            return None

    # ---- Startups -------------------------------------------------------------

    def upsert_startup(self, d: Dict[str, Any]) -> Optional[str]:
        if not self._enabled:
            return None
        name = (d.get("name") or "").strip()
        if not name:
            return None
        payload = {
            "name": name,
            "website": str(d.get("website") or "")[:255],
            "funding_amount": str(d.get("funding_amount") or "")[:100],
            "funding_round": str(d.get("funding_round") or "")[:50],
            "industry": str(d.get("industry") or "")[:100],
            "hq": str(d.get("hq") or "")[:100],
            "source": str(d.get("source") or "youtube")[:50],
            "source_video_url": str(d.get("source_video_url") or "")[:500],
            "timestamp_str": str(d.get("timestamp") or "")[:20],
            "confidence_score": float(d.get("confidence_score") or 0.0),
            "funding_amount_numeric": float(d.get("funding_amount_numeric") or 0.0),
            "internship_researched": bool(d.get("internship_researched") or False),
            "mission": str(d.get("mission") or "")[:5000],
        }
        existing = self._find_one("startups", [Query.equal("name", name)])
        if existing:
            doc_id = _doc_id(existing)
            self._safe(self.db.update_document, DB_ID, "startups", doc_id, payload,
                       label="update startup: " + name[:40])
            return doc_id
        else:
            r = self._safe(self.db.create_document, DB_ID, "startups", ID.unique(), payload,
                           label="create startup: " + name[:40])
            return _doc_id(r)

    def upsert_startups_batch(self, items: List[Dict], chunk_size: int = 25) -> int:
        ok = 0
        for i in range(0, len(items), chunk_size):
            for s in items[i:i + chunk_size]:
                if self.upsert_startup(s):
                    ok += 1
            gc.collect()
            time.sleep(0.2)
        logger.info("Appwrite batch startups: %d/%d OK", ok, len(items))
        return ok

    def get_startup_doc_id(self, name: str) -> Optional[str]:
        if not self._enabled:
            return None
        doc = self._find_one("startups", [Query.equal("name", name.strip())])
        return _doc_id(doc)

    def list_startups(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        if not self._enabled:
            return []
        try:
            res = self.db.list_documents(DB_ID, "startups",
                                          queries=[Query.limit(limit), Query.offset(offset)])
            return [_doc_to_dict(d) for d in _doc_list(res)]
        except AppwriteException as e:
            logger.warning("list_startups: %s", e)
            return []

    # ---- Lead Profiles -------------------------------------------------------

    def upsert_lead(self, d: Dict[str, Any]) -> Optional[str]:
        if not self._enabled:
            return None
        linkedin_url = (d.get("linkedin_url") or "").strip()
        if not linkedin_url:
            return None
        startup_name = str(d.get("startup_name") or "")[:255]
        startup_doc_id = d.get("startup_doc_id") or self.get_startup_doc_id(startup_name) or ""
        payload = {
            "startup_name": startup_name,
            "startup_doc_id": str(startup_doc_id)[:36],
            "name": str(d.get("name") or "")[:255],
            "role": str(d.get("role") or "")[:100],
            "linkedin_url": linkedin_url[:512],
            "confidence_score": float(d.get("confidence_score") or 0.0),
            "source": str(d.get("source") or "google_dork")[:50],
            "email_drafted": bool(d.get("email_drafted") or False),
            "email_drafted_at": str(d.get("email_drafted_at") or "")[:30],
        }
        existing = self._find_one("lead_profiles", [Query.equal("linkedin_url", linkedin_url)])
        if existing:
            doc_id = _doc_id(existing)
            self._safe(self.db.update_document, DB_ID, "lead_profiles", doc_id, payload,
                       label="update lead: " + payload["name"][:40])
            return doc_id
        else:
            r = self._safe(self.db.create_document, DB_ID, "lead_profiles", ID.unique(), payload,
                           label="create lead: " + payload["name"][:40])
            return _doc_id(r)

    def upsert_leads_batch(self, items: List[Dict], chunk_size: int = 25) -> int:
        ok = 0
        for i in range(0, len(items), chunk_size):
            for ld in items[i:i + chunk_size]:
                if self.upsert_lead(ld):
                    ok += 1
            gc.collect()
            time.sleep(0.2)
        logger.info("Appwrite batch leads: %d/%d OK", ok, len(items))
        return ok

    # ---- User Profiles (SaaS multi-tenant) -----------------------------------

    def upsert_user_profile(self, d: Dict[str, Any]) -> Optional[str]:
        if not self._enabled:
            return None
        uid = (d.get("appwrite_user_id") or "").strip()
        if not uid:
            return None
        payload = {
            "appwrite_user_id": uid[:36],
            "email": str(d.get("email") or "")[:255],
            "display_name": str(d.get("display_name") or "")[:100],
            "telegram_chat_id": str(d.get("telegram_chat_id") or "")[:30],
            "resume_text": str(d.get("resume_text") or "")[:10000],
            "gmail_refresh_token": str(d.get("gmail_refresh_token") or "")[:2000],
            "plan": str(d.get("plan") or "free")[:20],
            "target_pm": bool(d.get("target_pm") or False),
            "target_ai": bool(d.get("target_ai") or False),
            "target_fo": bool(d.get("target_fo") or False),
            "is_active": bool(d.get("is_active", True)),
        }
        existing = self._find_one("user_profiles", [Query.equal("appwrite_user_id", uid)])
        if existing:
            doc_id = _doc_id(existing)
            self._safe(self.db.update_document, DB_ID, "user_profiles", doc_id, payload,
                       label="update user: " + uid[:8])
            return doc_id
        else:
            r = self._safe(self.db.create_document, DB_ID, "user_profiles", ID.unique(), payload,
                           label="create user: " + uid[:8])
            return _doc_id(r)

    # ---- Health --------------------------------------------------------------

    def ping(self) -> bool:
        if not self._enabled:
            return False
        try:
            self.db.list_documents(DB_ID, "startups", queries=[Query.limit(1)])
            return True
        except Exception as e:
            logger.warning("Appwrite ping: %s", e)
            return False

    def is_enabled(self) -> bool:
        return self._enabled
