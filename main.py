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
    """Runs a one-off pipeline process."""
    logger.info("Executing one-off startup discovery pipeline...")
    from pipeline import PipelineRunner
    runner = PipelineRunner()
    runner.run()
    logger.info("One-off pipeline run completed successfully.")

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
    parser = argparse.ArgumentParser(description="Startup Discovery AI Agent CLI")
    
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--run-pipeline", "-p",
        action="store_true",
        help="Run the discovery pipeline immediately and exit"
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
    elif args.start_scheduler:
        start_scheduler()
    else:
        start_dashboard()

if __name__ == "__main__":
    main()
