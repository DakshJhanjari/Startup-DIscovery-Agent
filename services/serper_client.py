import os
import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class SerperClient:
    """
    Client for Serper.dev Google Search API.
    Provides fast, reliable real-time Google search results with snippets and direct links.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("SERPER_API_KEY")
        self.endpoint = "https://google.serper.dev/search"

    @property
    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def search(self, query: str, num_results: int = 5, gl: str = "in") -> List[Dict[str, Any]]:
        """
        Performs a Google Search query via Serper.
        Returns a list of dicts: [{'title': ..., 'link': ..., 'snippet': ...}, ...]
        """
        if not self.is_available:
            return []

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "q": query,
            "num": num_results,
            "gl": gl
        }

        try:
            resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data.get("organic", []):
                    results.append({
                        "title": item.get("title", ""),
                        "link": item.get("link", ""),
                        "href": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "body": item.get("snippet", "")
                    })
                return results
            else:
                logger.warning(f"[Serper] Request failed: {resp.status_code} - {resp.text[:120]}")
                return []
        except Exception as e:
            logger.error(f"[Serper] Error executing search for '{query}': {e}")
            return []
