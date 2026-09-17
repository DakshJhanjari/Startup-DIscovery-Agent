"""
migrate_sqlite_to_appwrite.py
==============================
One-time migration script: reads all Startup and LeadProfile records from
SQLite startups.db and upserts them into Appwrite Cloud.

Run AFTER setup_appwrite_schema.py:
    python scripts/migrate_sqlite_to_appwrite.py

Estimated time: ~5-10 minutes for 1,569 startups + 621 leads
(Appwrite free tier: 60 req/min; we pace at ~3 req/s = well within limits)
"""

import os, sys, time, gc, logging
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Startup, LeadProfile
from services.appwrite_client import AppwriteClient

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///startups.db")
CHUNK_SIZE = 25  # docs per Appwrite write cycle (RAM guardrail per AGENTS.md)


def migrate_startups(session, aw: AppwriteClient) -> int:
    logger.info("Fetching all startups from SQLite...")
    startups = session.query(Startup).order_by(Startup.id).all()
    total = len(startups)
    logger.info("Found %d startups. Uploading to Appwrite in chunks of %d...", total, CHUNK_SIZE)

    success = 0
    for i in range(0, total, CHUNK_SIZE):
        chunk = startups[i:i + CHUNK_SIZE]
        for s in chunk:
            d = s.to_dict()
            if aw.upsert_startup(d):
                success += 1
        logger.info("  Startups: %d / %d", min(i + CHUNK_SIZE, total), total)
        gc.collect()
        time.sleep(0.5)  # Stay within 60 req/min comfortably

    logger.info("Startups migration: %d / %d succeeded.", success, total)
    return success


def migrate_leads(session, aw: AppwriteClient) -> int:
    logger.info("Fetching all lead profiles from SQLite...")
    leads = session.query(LeadProfile).order_by(LeadProfile.id).all()
    total = len(leads)
    logger.info("Found %d leads. Uploading to Appwrite...", total)

    success = 0
    for i in range(0, total, CHUNK_SIZE):
        chunk = leads[i:i + CHUNK_SIZE]
        for ld in chunk:
            d = ld.to_dict()
            if aw.upsert_lead(d):
                success += 1
        logger.info("  Leads: %d / %d", min(i + CHUNK_SIZE, total), total)
        gc.collect()
        time.sleep(0.5)

    logger.info("Leads migration: %d / %d succeeded.", success, total)
    return success


def main():
    print("=" * 60)
    print("  SQLite -> Appwrite Cloud Migration")
    print(f"  Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # Connect SQLite
    engine = create_engine(DB_PATH)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Init Appwrite client
    aw = AppwriteClient()
    if not aw.is_enabled():
        print("ERROR: Appwrite client not enabled. Check APPWRITE_API_KEY in .env")
        sys.exit(1)

    print("\nPinging Appwrite...")
    if not aw.ping():
        print("ERROR: Could not reach Appwrite or invalid credentials.")
        sys.exit(1)
    print("Appwrite ping OK.\n")

    # Run migrations
    startup_count = migrate_startups(session, aw)
    lead_count = migrate_leads(session, aw)

    print("\n" + "=" * 60)
    print(f"  Migration Complete at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Startups uploaded : {startup_count}")
    print(f"  Leads uploaded    : {lead_count}")
    print("  Verify at https://cloud.appwrite.io")
    print("=" * 60)
    session.close()


if __name__ == "__main__":
    main()
