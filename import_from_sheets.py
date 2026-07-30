"""
import_from_sheets.py
------------------------------------------------------------
Imports all startups from Google Sheets back into the SQLite
database, then re-indexes ChromaDB so RAG queries reflect
the full startup catalog immediately.

Usage (local):  python import_from_sheets.py
Usage (EC2):    python3 import_from_sheets.py
------------------------------------------------------------
"""
import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def import_startups_from_sheet():
    # --- Connect to Google Sheets ---
    credentials_path = os.getenv("GOOGLE_SHEETS_CREDENTIALS_JSON")
    spreadsheet_id   = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID")

    if not credentials_path or not os.path.exists(credentials_path):
        logger.error(f"Credentials file not found: '{credentials_path}'. "
                     "Set GOOGLE_SHEETS_CREDENTIALS_JSON in your .env file.")
        return

    if not spreadsheet_id:
        logger.error("GOOGLE_SHEETS_SPREADSHEET_ID not set in .env file.")
        return

    try:
        import gspread
        from google.oauth2.service_account import Credentials
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
        creds  = Credentials.from_service_account_file(credentials_path, scopes=scopes)
        client = gspread.authorize(creds)
        sheet  = client.open_by_key(spreadsheet_id).get_worksheet(0)
        records = sheet.get_all_records()
        logger.info(f"Found {len(records)} rows in Google Sheet.")
    except Exception as e:
        logger.error(f"Failed to read Google Sheet: {e}")
        return

    if not records:
        logger.warning("Google Sheet is empty — nothing to import.")
        return

    # --- Import into SQLite ---
    from db.connection import get_db, init_db
    from db.models import Startup

    init_db()
    imported = 0
    skipped  = 0

    with get_db() as db:
        for row in records:
            name = str(row.get("Startup Name", "")).strip()
            if not name:
                continue

            # Skip if already in DB (case-insensitive dedup)
            exists = db.query(Startup).filter(
                Startup.name.ilike(name)
            ).first()
            if exists:
                skipped += 1
                continue

            # Parse investors string back to list
            investors_raw = str(row.get("Investors", ""))
            investors = [i.strip() for i in investors_raw.split(",") if i.strip()]

            # Parse verification sources
            sources_raw = str(row.get("Verification Sources", ""))
            sources = [s.strip() for s in sources_raw.split(",") if s.strip()]

            # Parse confidence score
            try:
                confidence = float(row.get("Confidence Score", 0.0))
            except (ValueError, TypeError):
                confidence = 0.0

            # Parse funding amount numeric value
            funding_str = str(row.get("Funding Amount", ""))
            try:
                numeric = float(''.join(c for c in funding_str if c.isdigit() or c == '.'))
            except ValueError:
                numeric = None

            startup = Startup(
                name                 = name,
                website              = str(row.get("Website", "")) or None,
                funding_amount       = funding_str or None,
                funding_amount_numeric = numeric,
                funding_round        = str(row.get("Funding Round", "")) or None,
                investors            = json.dumps(investors),
                industry             = str(row.get("Industry", "")) or None,
                source_video_url     = str(row.get("Source Video URL", "")) or None,
                confidence_score     = confidence,
                verification_sources = json.dumps(sources),
                discovered_at        = datetime.utcnow(),
                source               = "sheets_import",
            )
            db.add(startup)
            imported += 1

        db.commit()
        logger.info(f"Import complete: {imported} new startups added, {skipped} already existed.")

    # --- Re-index ChromaDB so RAG reflects new data ---
    if imported > 0:
        logger.info("Re-indexing ChromaDB vector store with newly imported startups...")
        try:
            from services.rag_service import RAGService
            rag = RAGService()
            count = rag.index_all()
            logger.info(f"ChromaDB re-indexed: {count} total startups now in vector store.")
        except Exception as e:
            logger.warning(f"ChromaDB re-indexing failed (will auto-retry on next /ask query): {e}")

    return imported

if __name__ == "__main__":
    total = import_startups_from_sheet()
    print(f"\n✅ Done! {total} startups imported from Google Sheets into the database.")
    print("Your /ask RAG queries will now return results from the full startup catalog.")
