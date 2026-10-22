import os
import logging
import time
from apscheduler.schedulers.background import BackgroundScheduler
from pipeline import PipelineRunner

logger = logging.getLogger(__name__)

class PipelineScheduler:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.runner = PipelineRunner()
        self.daily_time = os.getenv("DAILY_RUN_TIME", "02:00")

    def _run_daily_suite(self):
        """Runs the discovery pipeline and then dispatches personalized internship research cards to subscribers."""
        logger.info("Executing scheduled daily startup discovery...")
        try:
            self.runner.run()
        except Exception as e:
            logger.error(f"Error in discovery pipeline run: {e}")

        logger.info("Executing scheduled daily internship subscription dispatch...")
        try:
            from internship_pipeline import run_internship_pipeline
            run_internship_pipeline()
        except Exception as e:
            logger.error(f"Error in internship subscription pipeline run: {e}")

    def start(self):
        """Starts the background scheduler."""
        try:
            hour, minute = map(int, self.daily_time.split(":"))
        except ValueError:
            logger.error(f"Invalid DAILY_RUN_TIME configuration: '{self.daily_time}'. Defaulting to 02:00.")
            hour, minute = 2, 0

        try:
            import zoneinfo
            ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
        except Exception:
            ist_tz = None

        logger.info(f"Scheduling discovery pipeline to run daily at {hour:02d}:{minute:02d} IST")
        
        self.scheduler.add_job(
            func=self._run_daily_suite,
            trigger="cron",
            hour=hour,
            minute=minute,
            timezone=ist_tz,
            id="daily_startup_discovery_job",
            replace_existing=True
        )
        
        self.scheduler.start()
        logger.info("Background scheduler started successfully.")

    def shutdown(self):
        """Shuts down the background scheduler."""
        logger.info("Shutting down background scheduler...")
        self.scheduler.shutdown()
        
    def trigger_now(self):
        """Triggers the pipeline job immediately."""
        logger.info("Triggering discovery pipeline job immediately...")
        self.runner.run()
