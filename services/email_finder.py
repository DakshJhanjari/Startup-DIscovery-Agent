"""
Hunter.io Email Finder Service
================================
Enriches LeadProfile records with email addresses discovered strictly via Hunter.io's
Email Finder API (https://api.hunter.io/v2/email-finder).

Lookup Strategy:
  1. Primary: Uses LinkedIn profile handle (e.g., linkedin.com/in/johndoe -> 'johndoe')
  2. Secondary: If LinkedIn handle is not indexed by Hunter (404), falls back to company
     domain + full person name (e.g., domain='zerodha.com', full_name='Nithin Kamath').

Key design principles (per AGENTS.md):
  - Strictly uses Hunter.io API for finding email IDs only.
  - ResearchCache checked before every external call (7-day TTL).
  - Quota guard: tracks monthly searches, halts when monthly quota is reached.
  - Graceful degradation: works via 'requests' or standard library 'urllib'.
  - Fully optional: if HUNTER_API_KEY is not configured, silently skips without errors.
"""

import os
import re
import logging
import datetime
import json
from urllib.parse import urlparse, urlencode
import urllib.request
import urllib.error
from typing import Optional, Tuple, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith("#") and "=" in _line:
                    _k, _v = _line.split("=", 1)
                    _k = _k.strip()
                    _v = _v.strip().strip("'\"")
                    if _k not in os.environ:
                        os.environ[_k] = _v

logger = logging.getLogger(__name__)

HUNTER_API_BASE = "https://api.hunter.io/v2"

# Regex to extract the handle from a full LinkedIn URL
# e.g. "https://www.linkedin.com/in/johndoe" → "johndoe"
LINKEDIN_HANDLE_RE = re.compile(
    r"linkedin\.com/in/([a-zA-Z0-9\-_%]+)", re.IGNORECASE
)


def _extract_linkedin_handle(linkedin_url: Optional[str]) -> Optional[str]:
    """Pull the slug/handle out of a LinkedIn profile URL."""
    if not linkedin_url:
        return None
    match = LINKEDIN_HANDLE_RE.search(linkedin_url)
    return match.group(1).rstrip("/") if match else None


def _extract_domain(url: Optional[str]) -> Optional[str]:
    """
    Extracts a clean domain name from a website URL.
    e.g. 'https://www.zerodha.com/about/' -> 'zerodha.com'
    """
    if not url:
        return None
    cleaned = url.strip()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned
    try:
        parsed = urlparse(cleaned)
        netloc = (parsed.netloc or "").lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        # Remove any port if present
        return netloc.split(":")[0] if netloc else None
    except Exception:
        return None


class HunterEmailFinder:
    """
    Wraps Hunter.io's Email Finder API. Exclusively used for finding email IDs.
    """

    def __init__(self):
        self.api_key = os.getenv("HUNTER_API_KEY", "").strip()
        # Minimum confidence score on the LeadProfile before spending an API search credit
        self.min_lead_confidence = float(
            os.getenv("HUNTER_MIN_LEAD_CONFIDENCE", "0.6")
        )
        # Default monthly quota limit (Free tier typically allows 50 searches/month)
        self.monthly_quota = int(os.getenv("HUNTER_MONTHLY_QUOTA", "50"))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def find_email_for_lead(
        self,
        lead,
        db,
        website: Optional[str] = None
    ) -> Optional[str]:
        """
        Main entry point. Given a LeadProfile ORM object and an active DB session,
        finds and returns the person's professional email address (str) or None.

        Lookup flow:
          1. Guard checks (API key, confidence score, monthly quota).
          2. Check ResearchCache for cached results (< 7 days old).
          3. Query Hunter API by LinkedIn handle.
          4. If handle not found, query Hunter API by domain + full name.
          5. Cache result (email or empty string) in ResearchCache.
        """
        if not self.api_key:
            logger.debug("[Hunter] HUNTER_API_KEY not configured — email lookup skipped.")
            return None

        # Check lead confidence score threshold
        confidence = getattr(lead, "confidence_score", 0.0) or 0.0
        if confidence < self.min_lead_confidence:
            logger.debug(
                f"[Hunter] Skipping '{getattr(lead, 'name', '')}' — confidence {confidence:.2f} "
                f"< threshold {self.min_lead_confidence}"
            )
            return None

        linkedin_url = getattr(lead, "linkedin_url", "")
        person_name = (getattr(lead, "name", "") or "").strip()
        handle = _extract_linkedin_handle(linkedin_url)
        domain = _extract_domain(website)

        # Build primary cache key
        cache_key = handle or (f"{domain}:{person_name}" if domain and person_name else None)
        if not cache_key:
            logger.debug("[Hunter] Neither LinkedIn handle nor domain+name available for lookup.")
            return None

        # Check ResearchCache
        cached = self._get_cache(db, cache_key)
        if cached is not None:
            logger.info(
                f"[Hunter] Cache hit for '{cache_key}': {cached or '(no email found previously)'}"
            )
            return cached or None

        # Check monthly quota
        if not self._has_quota_remaining(db):
            logger.warning("[Hunter] Monthly search quota reached. Skipping Hunter lookup.")
            return None

        email = None

        # Step 1: Search by LinkedIn handle
        if handle:
            email = self._lookup_by_handle(handle)

        # Step 2: Fallback to domain + full name if handle returned no email
        if not email and domain and person_name:
            logger.info(f"[Hunter] Trying fallback with domain '{domain}' and name '{person_name}'...")
            email = self._lookup_by_domain_and_name(domain, person_name)

        # Cache result (save empty string if None so repeat requests are not made within 7 days)
        self._set_cache(db, cache_key, email or "")

        return email

    # ------------------------------------------------------------------
    # Hunter API Callers (exclusively using /v2/email-finder)
    # ------------------------------------------------------------------

    def _lookup_by_handle(self, handle: str) -> Optional[str]:
        """Calls Hunter /v2/email-finder with linkedin_handle."""
        logger.info(f"[Hunter] Querying email for LinkedIn handle: '{handle}'")
        params = {"linkedin_handle": handle}
        status, data = self._http_get("email-finder", params)

        if status == 200 and data:
            entry = data.get("data", {})
            found_email = entry.get("email")
            score = entry.get("score", 0)
            if found_email:
                logger.info(f"[Hunter] Found email '{found_email}' (score: {score}) for handle '{handle}'")
                return found_email
        elif status == 404:
            logger.info(f"[Hunter] No profile found for LinkedIn handle '{handle}' in Hunter database.")
        elif status == 429:
            logger.warning("[Hunter] Rate limited (HTTP 429). Will retry on subsequent runs.")
        elif status == 403:
            logger.warning("[Hunter] HTTP 403 Forbidden — please check your HUNTER_API_KEY or account credits.")
        else:
            logger.warning(f"[Hunter] API returned HTTP {status} for handle '{handle}'.")

        return None

    def _lookup_by_domain_and_name(self, domain: str, full_name: str) -> Optional[str]:
        """Calls Hunter /v2/email-finder with domain and full_name."""
        logger.info(f"[Hunter] Querying email for '{full_name}' at domain '{domain}'")
        params = {
            "domain": domain,
            "full_name": full_name,
        }
        status, data = self._http_get("email-finder", params)

        if status == 200 and data:
            entry = data.get("data", {})
            found_email = entry.get("email")
            score = entry.get("score", 0)
            if found_email:
                logger.info(f"[Hunter] Found email '{found_email}' (score: {score}) for '{full_name}' @ '{domain}'")
                return found_email
        elif status == 404:
            logger.info(f"[Hunter] No email found for '{full_name}' @ '{domain}'.")
        elif status == 429:
            logger.warning("[Hunter] Rate limited (HTTP 429).")
        elif status == 403:
            logger.warning("[Hunter] HTTP 403 Forbidden.")
        else:
            logger.warning(f"[Hunter] API returned HTTP {status} for '{full_name}' @ '{domain}'.")

        return None

    # ------------------------------------------------------------------
    # HTTP Transport (Requests with standard library Urllib fallback)
    # ------------------------------------------------------------------

    def _http_get(self, endpoint: str, params: Dict[str, Any]) -> Tuple[int, Optional[Dict[str, Any]]]:
        """
        Executes an HTTP GET against Hunter API v2.
        Tries 'requests' first; falls back to 'urllib.request' if unavailable.
        """
        url = f"{HUNTER_API_BASE}/{endpoint.lstrip('/')}"
        query_params = dict(params)
        query_params["api_key"] = self.api_key

        # Option A: requests
        try:
            import requests
            resp = requests.get(url, params=query_params, timeout=12)
            try:
                json_data = resp.json()
            except Exception:
                json_data = None
            return resp.status_code, json_data
        except ImportError:
            pass
        except Exception as req_err:
            logger.warning(f"[Hunter] requests call failed ({req_err}), falling back to urllib.")

        # Option B: standard library urllib
        try:
            encoded_qs = urlencode(query_params)
            full_url = f"{url}?{encoded_qs}"
            req = urllib.request.Request(full_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=12) as response:
                body = response.read().decode("utf-8")
                return response.status, json.loads(body)
        except urllib.error.HTTPError as http_err:
            try:
                err_body = http_err.read().decode("utf-8")
                return http_err.code, json.loads(err_body)
            except Exception:
                return http_err.code, None
        except Exception as net_err:
            logger.error(f"[Hunter] Network connection error: {net_err}")
            return 0, None

    # ------------------------------------------------------------------
    # Monthly Quota Guard
    # ------------------------------------------------------------------

    def _has_quota_remaining(self, db) -> bool:
        """Returns True if monthly searches haven't reached monthly_quota."""
        try:
            from db.models import ResearchCache

            now = datetime.datetime.utcnow()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

            used_this_month = (
                db.query(ResearchCache)
                .filter(
                    ResearchCache.service_type == "hunter_email",
                    ResearchCache.updated_at >= month_start,
                )
                .count()
            )
            remaining = self.monthly_quota - used_this_month
            logger.debug(
                f"[Hunter] Quota usage this month: {used_this_month}/{self.monthly_quota} ({remaining} remaining)"
            )
            return remaining > 0
        except Exception as e:
            logger.warning(f"[Hunter] Quota check failed ({e}), allowing request.")
            return True

    # ------------------------------------------------------------------
    # ResearchCache (7-day TTL)
    # ------------------------------------------------------------------

    def _get_cache(self, db, cache_key: str) -> Optional[str]:
        """
        Retrieves cached email if under 7 days old.
        Returns:
          - Found email string
          - Empty string "" if checked previously and not found
          - None if not cached or expired
        """
        try:
            from db.models import ResearchCache

            entry = (
                db.query(ResearchCache)
                .filter(
                    ResearchCache.startup_name == cache_key,
                    ResearchCache.service_type == "hunter_email",
                )
                .first()
            )
            if not entry:
                return None

            age = datetime.datetime.utcnow() - entry.updated_at
            if age.days < 7:
                return entry.cached_json.get("email", "")
            return None
        except Exception as e:
            logger.warning(f"[Hunter] Cache read error for '{cache_key}': {e}")
            return None

    def _set_cache(self, db, cache_key: str, email: str) -> None:
        """Persists the email search result in ResearchCache with a 7-day TTL."""
        try:
            from db.models import ResearchCache

            entry = (
                db.query(ResearchCache)
                .filter(
                    ResearchCache.startup_name == cache_key,
                    ResearchCache.service_type == "hunter_email",
                )
                .first()
            )

            payload = {"email": email}
            if entry:
                entry.cached_json = payload
                entry.updated_at = datetime.datetime.utcnow()
            else:
                entry = ResearchCache(
                    startup_name=cache_key,
                    service_type="hunter_email",
                    cached_json=payload,
                    updated_at=datetime.datetime.utcnow(),
                )
                db.add(entry)

            db.commit()
        except Exception as e:
            logger.warning(f"[Hunter] Cache write error for '{cache_key}': {e}")
            try:
                db.rollback()
            except Exception:
                pass
