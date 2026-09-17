import os
import re
import logging
from typing import Optional, Dict, Tuple
from urllib.parse import urlparse
import requests
from dotenv import load_dotenv

load_dotenv()

from services.serper_client import SerperClient

logger = logging.getLogger(__name__)

KNOWN_ATS_DOMAINS = {
    "ashbyhq.com": "ashby",
    "jobs.ashbyhq.com": "ashby",
    "lever.co": "lever",
    "jobs.lever.co": "lever",
    "greenhouse.io": "greenhouse",
    "boards.greenhouse.io": "greenhouse",
    "workable.com": "workable",
    "apply.workable.com": "workable",
    "recruitee.com": "recruitee",
    "rippling-ats.com": "rippling",
    "bamboohr.com": "bamboohr",
    "zohorecruit.com": "zoho",
    "zohorecruit.in": "zoho",
}

class ATSCrawlerService:
    """
    Discovers unadvertised direct career boards & ATS links for startups
    (e.g., jobs.lever.co, jobs.ashbyhq.com, boards.greenhouse.io) using Serper Google Search
    and canonical website inspection.
    """

    def __init__(self):
        self.serper = SerperClient()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def discover_careers_url(self, startup_name: str, website: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
        """
        Discovers the careers / ATS portal URL for a startup.
        Returns: (careers_url, ats_provider)
          e.g. ("https://jobs.ashbyhq.com/zepto", "ashby")
               ("https://dhruvaspace.com/careers", "custom")
               (None, None)
        """
        if not startup_name:
            return None, None

        # Strategy 1: Targeted Google Search via Serper for hosted ATS platforms
        if self.serper.is_available:
            try:
                # Dork for popular ATS platforms
                query = f'"{startup_name}" site:jobs.ashbyhq.com OR site:jobs.lever.co OR site:boards.greenhouse.io OR site:apply.workable.com'
                results = self.serper.search(query, num_results=5)
                for r in results:
                    link = r.get("link", "")
                    domain = urlparse(link).netloc.lower()
                    for ats_domain, provider in KNOWN_ATS_DOMAINS.items():
                        if ats_domain in domain:
                            # Verify startup name or reasonable slug is in the URL or title
                            title = r.get("title", "").lower()
                            clean_name = re.sub(r"[^a-z0-9]", "", startup_name.lower())
                            link_clean = link.lower()
                            if clean_name in link_clean or startup_name.lower() in title:
                                logger.info(f"[ATSCrawler] Found verified ATS ({provider}) for {startup_name}: {link}")
                                return link, provider
            except Exception as e:
                logger.warning(f"[ATSCrawler] Serper ATS dork failed for {startup_name}: {e}")

        # Strategy 2: Check startup's own website /careers or /jobs with browser headers
        if website and website.startswith("http"):
            base_url = website.rstrip("/")
            test_paths = ["/careers", "/jobs", "/career", "/join-us", "/work-with-us"]
            for path in test_paths:
                test_url = f"{base_url}{path}"
                try:
                    resp = requests.get(test_url, headers=self.headers, timeout=4, allow_redirects=True)
                    if resp.status_code == 200:
                        final_url = resp.url
                        final_domain = urlparse(final_url).netloc.lower()
                        # Check if it redirected to an external ATS
                        provider = "custom"
                        for ats_domain, prov in KNOWN_ATS_DOMAINS.items():
                            if ats_domain in final_domain:
                                provider = prov
                                break
                        logger.info(f"[ATSCrawler] Found direct careers page for {startup_name}: {final_url} ({provider})")
                        return final_url, provider
                except Exception:
                    continue

        # Strategy 3: Targeted Search for company careers / open jobs
        if self.serper.is_available:
            try:
                query = f'"{startup_name}" (careers OR jobs OR "work with us")'
                results = self.serper.search(query, num_results=4)
                for r in results:
                    link = r.get("link", "")
                    link_lower = link.lower()
                    # Check if an ATS domain is in the link
                    for ats_domain, provider in KNOWN_ATS_DOMAINS.items():
                        if ats_domain in link_lower:
                            logger.info(f"[ATSCrawler] Found ATS ({provider}) via broad query for {startup_name}: {link}")
                            return link, provider
                    # Check if it belongs to the startup's domain or brand slug
                    clean_name = re.sub(r"[^a-z0-9]", "", startup_name.lower())
                    is_brand_match = False
                    if website:
                        parsed_web = urlparse(website).netloc.lower().replace("www.", "")
                        if (parsed_web and parsed_web in link_lower) or (clean_name and clean_name in link_lower):
                            is_brand_match = True
                    elif clean_name and clean_name in link_lower:
                        is_brand_match = True

                    if is_brand_match and any(term in link_lower for term in ["/career", "/job", "/join", "/openings"]):
                        # Avoid aggregator job sites
                        if not any(agg in link_lower for agg in ["linkedin.com", "naukri.com", "indeed.com", "glassdoor.com", "ambitionbox.com"]):
                            logger.info(f"[ATSCrawler] Found domain careers page for {startup_name}: {link}")
                            return link, "custom"
            except Exception as e:
                logger.warning(f"[ATSCrawler] Strategy 3 search failed for {startup_name}: {e}")

        return None, None
