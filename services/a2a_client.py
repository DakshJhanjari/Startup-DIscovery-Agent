import os
import uuid
import logging
import requests
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class A2AClient:
    """
    Client for interacting with the Cold Email Drafter Agent on Render
    via the Google A2A (Agent-to-Agent) protocol over JSON-RPC 2.0.
    """
    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url or os.getenv(
            "A2A_AGENT_URL", 
            "https://tele-bot-intern.onrender.com/a2a"
        )
        if not self.endpoint_url.endswith("/a2a"):
            self.endpoint_url = self.endpoint_url.rstrip("/") + "/a2a"

    def draft_cold_email(self, startup_id: int) -> Dict[str, Any]:
        """
        Gathers startup details, research fit, and decision maker email,
        then dispatches an A2A task to the Cold Email Drafter agent on Render.
        """
        from db.connection import get_db
        from db.models import Startup, ResearchCache, LeadProfile
        from services.email_finder import HunterEmailFinder

        with get_db() as db:
            startup = db.query(Startup).filter(Startup.id == startup_id).first()
            if not startup:
                return {
                    "success": False,
                    "error": f"Startup with ID {startup_id} not found."
                }

            # 1. Fetch Research / Role Fit
            cache_entry = db.query(ResearchCache).filter(
                ResearchCache.startup_name == startup.name,
                ResearchCache.service_type == "internship_research"
            ).first()
            
            research_data = cache_entry.cached_json if cache_entry else {}
            mission = research_data.get("mission", "Technology and business growth.")
            pm_fit = research_data.get("pm_fit", "")
            ai_fit = research_data.get("ai_fit", "")
            fo_fit = research_data.get("fo_fit", "")

            # 2. Fetch or Enrich Decision Maker Leads
            leads = db.query(LeadProfile).filter(LeadProfile.startup_id == startup_id).all()
            
            # Prioritize lead with email
            best_lead = None
            for l in leads:
                if l.email and "@" in l.email:
                    best_lead = l
                    break

            # If no email yet, try looking up via Hunter.io on the fly
            if not best_lead and leads:
                finder = HunterEmailFinder()
                for l in leads:
                    email = finder.find_email_for_lead(l, db, website=startup.website)
                    if email:
                        best_lead = l
                        break

            # Fallback to first lead if still no email
            if not best_lead and leads:
                best_lead = leads[0]

            # Construct Decision Maker block
            if best_lead:
                decision_maker_str = (
                    f"- Name: {best_lead.name}\n"
                    f"- Role: {best_lead.role or 'Founder / Executive'}\n"
                    f"- LinkedIn: {best_lead.linkedin_url or 'N/A'}\n"
                    f"- Verified Email: {best_lead.email or 'N/A'}"
                )
                target_email = best_lead.email or "N/A"
            else:
                decision_maker_str = (
                    f"- Name: Founding Team\n"
                    f"- Role: Leadership\n"
                    f"- LinkedIn: N/A\n"
                    f"- Verified Email: N/A"
                )
                target_email = "N/A"

            # Construct Role Fit text
            fit_points = []
            if pm_fit and pm_fit != "N/A":
                fit_points.append(f"Product Management Fit: {pm_fit}")
            if ai_fit and ai_fit != "N/A":
                fit_points.append(f"AI Automation Fit: {ai_fit}")
            if fo_fit and fo_fit != "N/A":
                fit_points.append(f"Founder's Office Fit: {fo_fit}")
            
            role_fit_text = "\n".join(fit_points) if fit_points else "General Internship Fit: Fast-paced strategy, operations, and product scaling."

            # Construct A2A prompt body
            text_prompt = (
                f"Startup Name: {startup.name}\n"
                f"Website: {startup.website or 'N/A'}\n"
                f"Funding: {startup.funding_amount or 'N/A'} ({startup.funding_round or 'N/A'})\n"
                f"Core Mission: {mission}\n\n"
                f"Target Role Fit:\n{role_fit_text}\n\n"
                f"Decision Maker:\n{decision_maker_str}"
            )

        # 3. Build JSON-RPC 2.0 A2A Payload
        task_id = f"task-{uuid.uuid4()}"
        payload = {
            "jsonrpc": "2.0",
            "id": task_id,
            "method": "tasks/send",
            "params": {
                "message": {
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": text_prompt
                        }
                    ]
                }
            }
        }

        logger.info(f"Sending A2A task to {self.endpoint_url} for startup '{startup.name}'...")
        try:
            resp = requests.post(
                self.endpoint_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            if resp.status_code != 200:
                logger.error(f"A2A request failed with status {resp.status_code}: {resp.text}")
                return {
                    "success": False,
                    "error": f"Agent returned HTTP {resp.status_code}"
                }

            data = resp.json()
            if "error" in data:
                logger.error(f"A2A returned error: {data['error']}")
                return {
                    "success": False,
                    "error": data["error"].get("message", "Unknown A2A error")
                }

            result = data.get("result", {})
            artifacts = result.get("artifacts", [])
            
            confirmation_text = ""
            subject = ""
            email_body = ""
            recruiter_email = target_email

            for art in artifacts:
                for part in art.get("parts", []):
                    if part.get("type") == "text":
                        confirmation_text = part.get("text", "")
                    elif part.get("type") == "data":
                        d = part.get("data", {})
                        subject = d.get("subject", "")
                        email_body = d.get("body", "")
                        if d.get("recruiter_email"):
                            recruiter_email = d.get("recruiter_email")

            return {
                "success": True,
                "startup_name": startup.name,
                "recruiter_email": recruiter_email,
                "subject": subject,
                "confirmation": confirmation_text,
                "body": email_body
            }

        except Exception as e:
            logger.error(f"Failed to communicate with A2A agent: {e}")
            return {
                "success": False,
                "error": str(e)
            }
