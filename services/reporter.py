import os
import logging
import datetime
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ReporterService:
    def __init__(self):
        self.webhook_url = os.getenv("WEBHOOK_URL")
        self.reports_dir = "reports"
        
        if not os.path.exists(self.reports_dir):
            os.makedirs(self.reports_dir)

    def generate_daily_report(self, startups: List[Dict[str, Any]]) -> str:
        """
        Generates a markdown report file summarizing the discovered startups.
        Saves it locally and triggers webhook notification if configured.
        Returns the path of the saved report.
        """
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        report_filename = f"daily_report_{today_str}.md"
        report_path = os.path.join(self.reports_dir, report_filename)
        
        total_funding_usd = 0.0
        funding_by_round = {}
        unique_investors = set()
        
        for s in startups:
            amt_num = s.get("funding_amount_numeric")
            if amt_num and isinstance(amt_num, (int, float)):
                total_funding_usd += float(amt_num)
                
            rnd = s.get("funding_round", "Unknown")
            funding_by_round[rnd] = funding_by_round.get(rnd, 0) + 1
            
            investors = s.get("investors", [])
            if isinstance(investors, list):
                for inv in investors:
                    if inv:
                        unique_investors.add(inv)
                        
        top_startups = sorted(
            startups,
            key=lambda x: (x.get("confidence_score", 0.0), x.get("funding_amount_numeric") or 0.0),
            reverse=True
        )

        md_content = f"# Startup Funding Discovery Report - {today_str}\n\n"
        md_content += f"## Executive Summary\n"
        md_content += f"- **Total Startups Discovered**: {len(startups)}\n"
        md_content += f"- **Total Tracked Funding**: ${total_funding_usd:,.2f} USD\n"
        md_content += f"- **Unique Investors Identified**: {len(unique_investors)}\n\n"
        
        md_content += "### Breakdown by Funding Round\n"
        for rnd, count in funding_by_round.items():
            md_content += f"- **{rnd}**: {count} startup(s)\n"
            
        md_content += "\n## Discovered Startups\n\n"
        md_content += "| Startup | Round | Amount | Industry | Website | Confidence | Source |\n"
        md_content += "|---|---|---|---|---|---|---|\n"
        
        for s in startups:
            name = s.get("name", "Unknown")
            rnd = s.get("funding_round", "N/A")
            amt = s.get("funding_amount", "N/A")
            ind = s.get("industry", "N/A")
            web = f"[{s.get('website')}]({s.get('website')})" if s.get('website') else "N/A"
            conf = f"{s.get('confidence_score', 0.0) * 100:.0f}%"
            src = f"[Video]({s.get('source_video_url')})" if s.get('source_video_url') else "N/A"
            md_content += f"| **{name}** | {rnd} | {amt} | {ind} | {web} | {conf} | {src} |\n"

        md_content += f"\n\n*Report generated automatically at {datetime.datetime.utcnow().isoformat()} UTC.*"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            
        logger.info(f"Daily report generated successfully and saved to {report_path}")

        if self.webhook_url:
            self._send_webhook_notification(len(startups), total_funding_usd, top_startups)

        return report_path

    def _send_webhook_notification(self, count: int, total_funding: float, top_startups: List[Dict[str, Any]]):
        """Sends rich daily startup internship research & leads summary to Telegram webhook."""
        logger.info("Sending report summary with Internship Fit research to webhook...")
        
        title = f"🚀 *Daily Startup Discovery & Internship Fit Digest*\n"
        body = (
            f"Discovered *{count}* newly funded startups today!\n"
            f"Total estimated funding: *${total_funding:,.2f}*\n\n"
            f"🔥 *Top 4 Startup Internship Opportunities & Role Fit:*\n\n"
        )

        from services.internship_researcher import InternshipResearcher
        from db.connection import get_db
        from db.models import Startup, LeadProfile

        researcher = InternshipResearcher()
        
        for idx, s in enumerate(top_startups[:4], 1):
            name = s.get("name", "Unknown Startup")
            rnd = s.get("funding_round", "N/A")
            amt = s.get("funding_amount", "N/A")
            ind = s.get("industry", "Tech")
            web = s.get("website", "")
            
            body += f"*{idx}. {name}* ({rnd} • {amt})\n"
            body += f"📍 Sector: `{ind}`\n"
            if web:
                body += f"🌐 Website: {web}\n"
                
            # Perform Search-Grounded Internship Research
            try:
                res = researcher.research_startup(name, rnd, amt)
                if res:
                    body += f"💡 *Mission*: _{res.mission}_\n"
                    if res.pm_fit:
                        body += f"🎯 *PM & Strategy Fit*: {res.pm_fit[:180]}...\n"
                    if res.ai_fit:
                        body += f"🤖 *AI Automation Fit*: {res.ai_fit[:180]}...\n"
                    if res.fo_fit:
                        body += f"🏢 *Founder's Office Fit*: {res.fo_fit[:180]}...\n"
            except Exception as res_err:
                logger.warning(f"Could not fetch research for {name}: {res_err}")

            # Fetch Decision Maker Leads (Founders, HR)
            try:
                with get_db() as db:
                    startup_db = db.query(Startup).filter(Startup.name == name).first()
                    if startup_db:
                        leads = db.query(LeadProfile).filter(LeadProfile.startup_id == startup_db.id).all()
                        if leads:
                            body += "👔 *Outreach Contacts*:\n"
                            for l in leads[:2]:
                                url_str = f"[{l.name}]({l.linkedin_url})" if l.linkedin_url else l.name
                                body += f"  • {url_str} - _{l.role}_\n"
            except Exception as lead_err:
                logger.warning(f"Could not fetch leads for {name}: {lead_err}")

            body += "\n---\n\n"

        payload = {
            "text": f"{title}\n{body}",
            "parse_mode": "Markdown"
        }
        
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=25)
            if response.status_code not in [200, 204]:
                logger.error(f"Webhook failed with status code {response.status_code}: {response.text}")
            else:
                logger.info("Daily internship research digest posted to Telegram webhook successfully.")
        except Exception as e:
            logger.error(f"Failed to post to webhook: {e}")

    def send_daily_summary(self, startups: List[Dict[str, Any]], stats: Dict[str, Any] = None) -> str:
        """
        Generates report and always sends a status update to the Telegram webhook,
        guaranteeing the user gets a daily digest at scheduled time even on slow news days.
        """
        if startups:
            return self.generate_daily_report(startups)

        if not self.webhook_url:
            logger.warning("No WEBHOOK_URL configured; skipping daily Telegram digest.")
            return ""

        today_str = datetime.date.today().strftime("%Y-%m-%d")
        videos_checked = stats.get("videos_found", 0) if stats else 0

        msg = (
            f"ℹ️ *Daily Startup Discovery Digest — {today_str}*\n\n"
            f"Pipeline executed successfully at 09:30 IST.\n"
            f"• Scanned channels & feeds: `{videos_checked}` items evaluated\n"
            f"• New funding announcements meeting threshold: *0*\n\n"
            f"No fresh startup funding rounds were detected in the last 24 hours. All scrapers and monitors remain active for tomorrow."
        )
        payload = {
            "text": msg,
            "parse_mode": "Markdown"
        }
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=20)
            if response.status_code not in [200, 204]:
                logger.error(f"Empty digest webhook failed with status code {response.status_code}: {response.text}")
            else:
                logger.info("Empty daily digest status message posted to Telegram webhook successfully.")
        except Exception as e:
            logger.error(f"Failed to post empty digest webhook: {e}")
        return ""
