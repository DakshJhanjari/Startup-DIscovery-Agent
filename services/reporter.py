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
            numeric_amt = s.get("funding_amount_numeric")
            if numeric_amt:
                total_funding_usd += numeric_amt
                
            rnd = s.get("funding_round") or "Unknown"
            funding_by_round[rnd] = funding_by_round.get(rnd, 0) + 1
            
            investors_list = s.get("investors")
            if isinstance(investors_list, list):
                for inv in investors_list:
                    if inv:
                        unique_investors.add(inv.strip())

        sorted_startups = sorted(
            startups, 
            key=lambda x: (x.get("confidence_score", 0.0), x.get("funding_amount_numeric") or 0.0),
            reverse=True
        )
        
        top_startups = sorted_startups[:20]

        md_content = f"""# Startup Funding Discovery Report - {today_str}

## Summary Metrics
- **Total Startups Discovered Today:** {len(startups)}
- **Total Estimated Funding (USD):** ${total_funding_usd:,.2f}
- **Unique Investors Discovered:** {len(unique_investors)}

### Funding Rounds Breakdown
"""
        for rnd, count in funding_by_round.items():
            md_content += f"- **{rnd}:** {count} startup(s)\n"

        md_content += "\n## Discovered Investors\n"
        if unique_investors:
            md_content += ", ".join(sorted(list(unique_investors))) + "\n"
        else:
            md_content += "*No investors extracted today.*\n"

        md_content += f"\n## Top 20 Discovered Startups (Sorted by Confidence/Size)\n"
        md_content += "| Startup Name | Round | Amount | Industry | Website | Confidence | Source Video |\n"
        md_content += "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n"
        
        for s in top_startups:
            name = s.get("name")
            rnd = s.get("funding_round") or "N/A"
            amt = s.get("funding_amount") or "N/A"
            ind = s.get("industry") or "N/A"
            web = f"[{s.get('website')}]({s.get('website')})" if s.get('website') else "N/A"
            conf = f"{s.get('confidence_score', 0.0) * 100:.0f}%"
            src = f"[Video]({s.get('source_video_url')})"
            md_content += f"| **{name}** | {rnd} | {amt} | {ind} | {web} | {conf} | {src} |\n"

        md_content += f"\n\n*Report generated automatically at {datetime.datetime.utcnow().isoformat()} UTC.*"

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(md_content)
            
        logger.info(f"Daily report generated successfully and saved to {report_path}")

        if self.webhook_url:
            self._send_webhook_notification(len(startups), total_funding_usd, top_startups)

        return report_path

    def _send_webhook_notification(self, count: int, total_funding: float, top_startups: List[Dict[str, Any]]):
        """Sends a summaries message of the report to Slack/Discord."""
        logger.info("Sending report summary to webhook...")
        
        title = f"🚀 *Startup Funding Discovery Agent - Daily Summary*"
        body = (
            f"Discovered *{count}* recently funded startups today!\n"
            f"Total estimated funding identified: *${total_funding:,.2f}*\n\n"
            f"*Top Discovered Startups:*\n"
        )
        
        for s in top_startups[:5]:
            body += f"- *{s.get('name')}*: {s.get('funding_round')} ({s.get('funding_amount')}) - `{s.get('industry')}`\n"
            
        payload = {"text": f"{title}\n{body}"}
        
        try:
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            if response.status_code not in [200, 204]:
                logger.error(f"Webhook failed with status code {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"Failed to post to webhook: {e}")
