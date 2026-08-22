"""
A2A Client Service
==================
Connects the Startup Discovery Pipeline (A2A Client Agent) to the
Cold Email Drafter Agent (A2A Remote Agent).

Protocol: Google A2A - JSON-RPC 2.0 over HTTP
Spec: D:\Python Files\Intern Sorting\AGENT_SPEC_AND_A2A_PROTOCOL.md
"""

import os
import uuid
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)


class A2AEmailDrafterClient:
    def __init__(self):
        self.base_url = os.getenv("EMAIL_AGENT_URL", "").rstrip("/")
        self.enabled = os.getenv("ENABLE_EMAIL_DRAFTER", "false").lower() == "true"
        self.timeout = 45
        self._agent_card_cache = None

    def discover(self) -> bool:
        """Fetch Agent Card and confirm generate_cold_email skill exists."""
        if not self.base_url:
            logger.warning("[A2A] EMAIL_AGENT_URL not set.")
            return False
        try:
            resp = requests.get(f"{self.base_url}/.well-known/agent.json", timeout=10)
            resp.raise_for_status()
            card = resp.json()
            self._agent_card_cache = card
            skill_ids = [s.get("id") for s in card.get("skills", [])]
            if "generate_cold_email" not in skill_ids:
                logger.warning(f"[A2A] generate_cold_email skill missing. Got: {skill_ids}")
                return False
            logger.info(f"[A2A] Discovered: {card.get('name')} v{card.get('version')} @ {self.base_url}")
            return True
        except Exception as e:
            logger.error(f"[A2A] Discovery failed: {e}")
            return False

    def _build_job_description(self, startup_name, startup_mission, funding_round,
                                funding_amount, industry, founder_name, founder_role,
                                linkedin_url, website) -> str:
        lines = [f"Internship Application Target - {startup_name}", ""]
        lines.append(f"Company: {startup_name}")
        if website:
            lines.append(f"Website: {website}")
        if industry:
            lines.append(f"Industry/Sector: {industry}")
        if startup_mission:
            lines.append(f"Mission: {startup_mission}")
        if funding_amount or funding_round:
            parts = " ".join(filter(None, [funding_amount, funding_round]))
            lines.append(f"Recent Funding: {parts}")
        lines += ["", f"Key Contact: {founder_name} ({founder_role})"]
        if linkedin_url:
            lines.append(f"LinkedIn: {linkedin_url}")
        lines += [
            "",
            "Roles targeting: Product Management Intern / AI Automation Intern / Founders Office Intern",
            "",
            "Draft a personalised cold internship application email to this startup.",
            "Use recruiter email if available, otherwise address the key contact named above.",
        ]
        return "\n".join(lines)

    def _send_task(self, job_description: str, task_id: str) -> Optional[dict]:
        payload = {
            "jsonrpc": "2.0",
            "id": f"discovery-agent-{task_id}",
            "method": "tasks/send",
            "params": {
                "id": task_id,
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": job_description}]
                }
            }
        }
        try:
            resp = requests.post(
                f"{self.base_url}/a2a", json=payload,
                headers={"Content-Type": "application/json"}, timeout=self.timeout
            )
            resp.raise_for_status()
            data = resp.json()
            if "error" in data:
                logger.error(f"[A2A] RPC error: {data['error']}")
                return None
            result = data.get("result", {})
            state = result.get("status", {}).get("state")
            if state != "completed":
                logger.warning(f"[A2A] Task not completed, state={state}")
                return None
            return result
        except requests.exceptions.Timeout:
            logger.error(f"[A2A] Task timed out after {self.timeout}s")
            return None
        except Exception as e:
            logger.error(f"[A2A] tasks/send failed: {e}")
            return None

    def _parse_artifact(self, result: dict) -> dict:
        for artifact in result.get("artifacts", []):
            if artifact.get("name") == "email_draft_confirmation":
                for part in artifact.get("parts", []):
                    if part.get("type") == "data":
                        return part.get("data", {})
        return {}

    def draft_email_for_lead(
        self,
        startup_name: str = "",
        startup_mission: str = "",
        funding_round: str = "",
        funding_amount: str = "",
        industry: str = "",
        founder_name: str = "",
        founder_role: str = "Founder",
        linkedin_url: str = "",
        website: str = "",
    ) -> bool:
        """Full A2A flow: discover -> build message -> send task -> parse result."""
        if not self.enabled:
            logger.info("[A2A] Disabled (ENABLE_EMAIL_DRAFTER=false). Skipping.")
            return False
        if not self.base_url:
            logger.warning("[A2A] EMAIL_AGENT_URL not configured. Skipping.")
            return False
        if not self._agent_card_cache:
            if not self.discover():
                return False
        task_id = str(uuid.uuid4())
        jd = self._build_job_description(
            startup_name, startup_mission, funding_round,
            funding_amount, industry, founder_name,
            founder_role, linkedin_url, website
        )
        logger.info(f"[A2A] Sending draft task for {startup_name} / {founder_name}")
        result = self._send_task(jd, task_id)
        if not result:
            return False
        artifact = self._parse_artifact(result)
        saved = artifact.get("gmail_draft_saved", False)
        if saved:
            logger.info(
                f"[A2A] Gmail draft saved | Subject: {artifact.get('subject')} "
                f"| To: {artifact.get('recruiter_email')}"
            )
        else:
            logger.warning(f"[A2A] gmail_draft_saved=False for {startup_name}")
        return saved
