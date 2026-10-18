import os
import logging
from typing import List, Dict, Any
import gspread
from google.oauth2.service_account import Credentials

import re

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

def _clean_spreadsheet_id(raw_id: str) -> str:
    """Extracts the spreadsheet ID if the user provided a full Google Sheets URL."""
    if not raw_id:
        return ""
    raw_id = raw_id.strip()
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", raw_id)
    if match:
        return match.group(1)
    return raw_id

class GoogleSheetsService:
    def __init__(self):
        self.credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
        raw_sheet_id = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "")
        self.spreadsheet_id = _clean_spreadsheet_id(raw_sheet_id)
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
        """Connects to Google Sheets using service account credentials (file path or JSON string)."""
        if not self.spreadsheet_id:
            logger.warning("GOOGLE_SHEETS_SPREADSHEET_ID is not configured. Skipping Sheets integration.")
            return False

        if not self.credentials_path:
            logger.warning("GOOGLE_SHEETS_CREDENTIALS_JSON is not configured. Skipping Sheets integration.")
            return False

        try:
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive"
            ]
            if os.path.exists(self.credentials_path):
                creds = Credentials.from_service_account_file(self.credentials_path, scopes=scopes)
            elif self.credentials_path.strip().startswith("{"):
                import json
                info = json.loads(self.credentials_path)
                creds = Credentials.from_service_account_info(info, scopes=scopes)
            else:
                logger.warning(f"Google Sheets credentials file '{self.credentials_path}' not found. Skipping Sheets integration.")
                return False

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
    def _append_rows_safely(self, sheet, rows: List[List[Any]], start_col: str, end_col: str):
        """
        Appends rows to the worksheet safely by locating the actual last non-empty row.
        This prevents overwriting formatted tables or writing into trailing blank cells.
        """
        if not rows:
            return
        
        # Get all cell values to find the actual last filled row
        values = sheet.get_all_values()
        last_filled_idx = -1
        for idx in range(len(values) - 1, -1, -1):
            if any(str(cell).strip() for cell in values[idx]):
                last_filled_idx = idx
                break
                
        next_row = last_filled_idx + 2  # 1-indexed row index + 1 for next row
        end_row = next_row + len(rows) - 1
        
        # Check if we need to expand the sheet's rows to avoid "Range exceeds grid limits" APIError
        total_rows = sheet.row_count
        if end_row > total_rows:
            rows_to_add = end_row - total_rows
            sheet.add_rows(rows_to_add)
            logger.info(f"Expanded worksheet '{sheet.title}' by {rows_to_add} rows.")
        
        # Determine coordinate range (e.g. A37:G50)
        range_name = f"{start_col}{next_row}:{end_col}{end_row}"
        
        # Write to sheet using update
        sheet.update(range_name, rows)
        logger.info(f"Safely wrote {len(rows)} rows to range {range_name} in worksheet '{sheet.title}'.")

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
                self._append_rows_safely(self.sheet, rows_to_append, "A", "K")
                added_count = len(rows_to_append)
                logger.info(f"Successfully appended {added_count} rows to Google Sheet.")
                
        except Exception as e:
            logger.error(f"Error syncing startups to Google Sheets: {e}")
            
        return added_count

    def sync_leads(self, leads: List[Dict[str, Any]]) -> int:
        """
        Syncs a list of LinkedIn lead dicts to a dedicated 'Leads' worksheet tab.
        The tab is auto-created if it does not exist.

        Returns the count of successfully added rows.
        """
        if not self._connect():
            return 0

        if not leads:
            logger.info("No leads to sync to Google Sheets.")
            return 0

        lead_headers = [
            "Startup Name",
            "Person Name",
            "Role",
            "LinkedIn URL",
            "Confidence Score",
            "Source",
            "Discovered At",
            "Email ID",
        ]

        try:
            spreadsheet = self.client.open_by_key(self.spreadsheet_id)

            # Get or create the "Leads" worksheet
            try:
                leads_sheet = spreadsheet.worksheet("Leads")
            except Exception:
                leads_sheet = spreadsheet.add_worksheet(title="Leads", rows="1000", cols="10")
                leads_sheet.append_row(lead_headers)
                logger.info("Created 'Leads' worksheet tab in Google Sheets.")

            first_row = leads_sheet.row_values(1)
            if not first_row:
                leads_sheet.append_row(lead_headers)
                first_row = lead_headers

            # Dynamically locate column indices for Email and LinkedIn URL
            email_col_idx = None
            linkedin_col_idx = 4
            for c_idx, h in enumerate(first_row, 1):
                clean_h = str(h).strip().lower()
                if "email" in clean_h:
                    email_col_idx = c_idx
                elif "linkedin" in clean_h:
                    linkedin_col_idx = c_idx

            if not email_col_idx:
                email_col_idx = len(first_row) + 1
                leads_sheet.update_cell(1, email_col_idx, "Email ID")
                logger.info(f"Added 'Email ID' header at Column {email_col_idx}.")

            # Read all existing rows to map URLs and existing emails
            all_values = leads_sheet.get_all_values()
            existing_map = {}
            for r_idx, row in enumerate(all_values[1:], start=2):  # row 1 is header
                url = row[linkedin_col_idx - 1].strip().lower() if len(row) >= linkedin_col_idx else ""
                cur_email = row[email_col_idx - 1].strip() if len(row) >= email_col_idx else ""
                if url:
                    existing_map[url] = {
                        "row": r_idx,
                        "email": cur_email,
                    }

            rows_to_append = []
            for lead in leads:
                url = str(lead.get("linkedin_url", "")).strip()
                if not url:
                    continue
                url_lower = url.lower()
                new_email = str(lead.get("email", "") or "").strip()

                if url_lower in existing_map:
                    # Lead already exists in the sheet
                    old_info = existing_map[url_lower]
                    old_email = old_info["email"]
                    # If email was empty or placeholder ('.', '-'), update in-place
                    if (not old_email or old_email in (".", "-")) and new_email:
                        try:
                            leads_sheet.update_cell(old_info["row"], email_col_idx, new_email)
                            old_info["email"] = new_email
                            logger.info(f"Updated email in Google Sheet for row {old_info['row']} ({url}): {new_email}")
                        except Exception as cell_err:
                            logger.warning(f"Failed to update email cell for row {old_info['row']}: {cell_err}")
                    continue

                # Prepare new row matching sheet layout
                rows_to_append.append([
                    lead.get("startup_name", ""),
                    lead.get("name", ""),
                    lead.get("role", ""),
                    url,
                    lead.get("confidence_score", 0.0),
                    lead.get("source", ""),
                    lead.get("created_at", ""),
                    new_email,
                ])
                existing_map[url_lower] = {"row": None, "email": new_email}

            if rows_to_append:
                self._append_rows_safely(leads_sheet, rows_to_append, "A", "H")
                logger.info(f"Synced {len(rows_to_append)} new lead(s) to 'Leads' Google Sheets tab.")
            return len(rows_to_append)

        except Exception as e:
            logger.error(f"Error syncing leads to Google Sheets 'Leads' tab: {e}")
            return 0

    def sync_shark_tank_startups(self, startups: List[Dict[str, Any]]) -> int:
        """
        Syncs Shark Tank India startup data to a dedicated 'Shark Tank' worksheet tab.
        Returns the count of successfully added rows.
        """
        if not self._connect():
            return 0

        shark_tank_headers = [
            "Startup Name", "Season", "Episode", "Sector",
            "Ask Amount", "Deal Amount", "Equity %",
            "Sharks", "Deal Made", "Website", "Founded Year", "Description"
        ]

        try:
            spreadsheet = self.client.open_by_key(self.spreadsheet_id)
            try:
                st_sheet = spreadsheet.worksheet("Shark Tank")
            except Exception:
                st_sheet = spreadsheet.add_worksheet(title="Shark Tank", rows="1000", cols="15")
                st_sheet.append_row(shark_tank_headers)
                logger.info("Created 'Shark Tank' worksheet tab in Google Sheets.")

            existing_records = st_sheet.get_all_records()
            existing_names = {
                str(r.get("Startup Name", "")).strip().lower()
                for r in existing_records
            }

            rows_to_append = []
            for s in startups:
                name = str(s.get("name", "")).strip()
                if not name or name.lower() in existing_names:
                    continue
                sharks_str = ", ".join(s.get("sharks", [])) if isinstance(s.get("sharks"), list) else str(s.get("sharks", ""))
                rows_to_append.append([
                    name,
                    s.get("season", ""),
                    s.get("episode", ""),
                    s.get("sector", ""),
                    s.get("ask_amount", ""),
                    s.get("deal_amount", ""),
                    s.get("equity_pct", ""),
                    sharks_str,
                    "Yes" if s.get("deal_made") else "No",
                    s.get("website", ""),
                    s.get("founded_year", ""),
                    s.get("description", ""),
                ])
                existing_names.add(name.lower())

            if rows_to_append:
                self._append_rows_safely(st_sheet, rows_to_append, "A", "L")
                logger.info(f"Synced {len(rows_to_append)} Shark Tank startup(s) to Google Sheets.")
            return len(rows_to_append)

        except Exception as e:
            logger.error(f"Error syncing Shark Tank startups to Google Sheets: {e}")
            return 0
