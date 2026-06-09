import os
import logging
from typing import List, Dict, Any
import gspread
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    def __init__(self):
        self.credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
        self.spreadsheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")
        self.client = None
        self.sheet = None
        
        self.headers = [
            "Startup Name", 
            "Website", 
            "Funding Amount", 
            "Funding Round", 
            "Investors", 
            "Industry", 
            "Source Video URL", 
            "Timestamp", 
            "Upload Date", 
            "Confidence Score", 
            "Verification Sources"
        ]

    def _connect(self) -> bool:
        """Connects to Google Sheets using service account credentials."""
        if not self.credentials_path or not os.path.exists(self.credentials_path):
            logger.warning(f"Google Sheets credentials file '{self.credentials_path}' not found. Skipping Sheets integration.")
            return False
        
        if not self.spreadsheet_id:
            logger.warning("GOOGLE_SHEETS_SPREADSHEET_ID is not configured. Skipping Sheets integration.")
            return False

        try:
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
            creds = Credentials.from_service_account_file(self.credentials_path, scopes=scopes)
            self.client = gspread.authorize(creds)
            
            spreadsheet = self.client.open_by_key(self.spreadsheet_id)
            self.sheet = spreadsheet.get_worksheet(0)
            
            values = self.sheet.get_all_values()
            if not values or len(values) == 0:
                self.sheet.append_row(self.headers)
                logger.info("Initialized Google Sheet with headers.")
                
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Google Sheets: {e}")
            return False

    def sync_startups(self, startups: List[Dict[str, Any]]) -> int:
        """
        Syncs a list of startup dictionaries to the Google Sheet.
        Deduplicates against startups already in the sheet.
        Returns the count of successfully added rows.
        """
        if not self._connect():
            return 0

        if not startups:
            logger.info("No startups to sync to Google Sheets.")
            return 0

        added_count = 0
        try:
            records = self.sheet.get_all_records()
            existing_names = {str(r.get("Startup Name", "")).strip().lower() for r in records}
            
            rows_to_append = []
            for startup in startups:
                name = str(startup.get("name", "")).strip()
                if not name:
                    continue
                    
                if name.lower() in existing_names:
                    logger.info(f"Startup '{name}' already exists in Google Sheet. Skipping.")
                    continue
                
                investors_str = ", ".join(startup.get("investors", [])) if isinstance(startup.get("investors"), list) else str(startup.get("investors", ""))
                sources_str = ", ".join(startup.get("verification_sources", [])) if isinstance(startup.get("verification_sources"), list) else str(startup.get("verification_sources", ""))
                
                row = [
                    name,
                    startup.get("website", ""),
                    startup.get("funding_amount", ""),
                    startup.get("funding_round", ""),
                    investors_str,
                    startup.get("industry", ""),
                    startup.get("source_video_url", ""),
                    startup.get("timestamp", ""),
                    startup.get("upload_date", ""),
                    startup.get("confidence_score", 0.0),
                    sources_str
                ]
                rows_to_append.append(row)
                existing_names.add(name.lower())

            if rows_to_append:
                self.sheet.append_rows(rows_to_append)
                added_count = len(rows_to_append)
                logger.info(f"Successfully appended {added_count} rows to Google Sheet.")
                
        except Exception as e:
            logger.error(f"Error syncing startups to Google Sheets: {e}")
            
        return added_count
