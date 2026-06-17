import os
import argparse
import logging
import uvicorn
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("startup_agent")

def run_pipeline():
    """Runs a one-off YouTube pipeline process."""
    logger.info("Executing startup discovery pipeline (YouTube)...")
    from pipeline import PipelineRunner
    runner = PipelineRunner()
    stats = runner.run()
    logger.info(f"Pipeline complete. Stats: {stats}")

def run_inc42():
    """Fetches latest funding news from Inc42 and saves to DB + Sheets."""
    logger.info("Fetching latest Inc42 funding news...")
    from db.connection import get_db, init_db
    from db.models import Startup
    from services.inc42_scraper import Inc42Scraper
    from services.sheets import GoogleSheetsService
    import datetime

    init_db()
    scraper = Inc42Scraper()
    startups_data = scraper.fetch_latest()

    saved = 0
    with get_db() as db:
        for s in startups_data:
            name = s.get("name", "").strip()
            if not name:
                continue
            existing = db.query(Startup).filter(Startup.name.ilike(name)).first()
            if existing:
                logger.info(f"'{name}' already in DB. Skipping.")
                continue
            new_startup = Startup(
                name=name,
                website=s.get("website"),
                funding_amount=s.get("funding_amount"),
                funding_amount_numeric=s.get("funding_amount_numeric"),
                funding_round=s.get("funding_round"),
                investors=s.get("investors", []),
                industry=s.get("industry"),
                source_video_url=s.get("source_url", ""),
                source="inc42",
                confidence_score=s.get("confidence_score", 0.7),
                verification_sources=s.get("verification_sources", []),
                upload_date=s.get("upload_date"),
            )
            db.add(new_startup)
            saved += 1

    logger.info(f"Inc42 run complete. Saved {saved} new startups.")

    # Sync to Google Sheets
    if saved > 0:
        try:
            sheets = GoogleSheetsService()
            synced = sheets.sync_startups([s for s in startups_data if s.get("name")])
            logger.info(f"Synced {synced} startups to Google Sheets.")
        except Exception as e:
            logger.warning(f"Google Sheets sync failed: {e}")

def load_shark_tank():
    """Scrapes Shark Tank India data and loads into the DB."""
    logger.info("Loading Shark Tank India database...")
    from db.connection import get_db, init_db
    from db.models import SharkTankStartup
    from services.shark_tank_scraper import SharkTankScraper

    init_db()
    scraper = SharkTankScraper()
    startups = scraper.scrape_all_seasons()

    saved = 0
    with get_db() as db:
        for s in startups:
            name = s.get("name", "").strip()
            if not name:
                continue
            # Check duplicate by name + season
            existing = db.query(SharkTankStartup).filter(
                SharkTankStartup.name.ilike(name),
                SharkTankStartup.season == s.get("season")
            ).first()
            if existing:
                logger.info(f"Shark Tank startup '{name}' (S{s.get('season')}) already in DB.")
                continue

            entry = SharkTankStartup(
                name=name,
                season=s.get("season"),
                episode=s.get("episode"),
                sector=s.get("sector"),
                ask_amount=s.get("ask_amount"),
                ask_amount_numeric=s.get("ask_amount_numeric"),
                deal_amount=s.get("deal_amount"),
                deal_amount_numeric=s.get("deal_amount_numeric"),
                equity_pct=s.get("equity_pct"),
                sharks=s.get("sharks", []),
                deal_made=1 if s.get("deal_made") else 0,
                website=s.get("website"),
                founded_year=s.get("founded_year"),
                description=s.get("description"),
            )
            db.add(entry)
            saved += 1

    logger.info(f"Shark Tank load complete. Saved {saved} startups.")

def start_scheduler():
    """Runs a standalone scheduler daemon."""
    logger.info("Starting standalone scheduler daemon...")
    import time
    from scheduler import PipelineScheduler
    scheduler = PipelineScheduler()
    scheduler.start()
    logger.info("Scheduler daemon is active. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("Scheduler daemon stopped.")

def start_dashboard():
    """Runs the FastAPI dashboard web server."""
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "127.0.0.1")
    logger.info(f"Starting web dashboard on http://{host}:{port}...")
    uvicorn.run("dashboard.app:app", host=host, port=port, reload=False)

def main():
    parser = argparse.ArgumentParser(
        description="Startup Discovery AI Agent CLI",
        formatter_class=argparse.RawTextHelpFormatter
    )

    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--run-pipeline", "-p",
        action="store_true",
        help="Run YouTube discovery pipeline immediately and exit"
    )
    group.add_argument(
        "--run-inc42",
        action="store_true",
        help="Fetch latest Inc42 funding news and save to DB + Sheets"
    )
    group.add_argument(
        "--load-shark-tank",
        action="store_true",
        help="Scrape & load all Shark Tank India seasons into the DB"
    )
    group.add_argument(
        "--start-scheduler", "-s",
        action="store_true",
        help="Run the background scheduler daemon standalone"
    )
    group.add_argument(
        "--start-dashboard", "-d",
        action="store_true",
        help="Run the FastAPI web dashboard and API (default)"
    )

    args = parser.parse_args()

    if args.run_pipeline:
        run_pipeline()
    elif args.run_inc42:
        run_inc42()
    elif args.load_shark_tank:
        load_shark_tank()
    elif args.start_scheduler:
        start_scheduler()
    else:
        start_dashboard()

if __name__ == "__main__":
    main()
