import os
import logging
import datetime
from typing import List, Dict, Any

from db.connection import get_db, init_db
from db.models import ProcessedVideo, Startup
from services.youtube import YouTubeService
from services.transcription import TranscriptionService
from services.llm_extractor import LLMExtractorService
from services.web_verifier import WebVerifierService
from services.sheets import GoogleSheetsService
from services.reporter import ReporterService

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

class PipelineRunner:
    def __init__(self):
        init_db()
        
        self.youtube = YouTubeService()
        self.transcription = TranscriptionService()
        self.extractor = LLMExtractorService()
        self.verifier = WebVerifierService()
        self.sheets = GoogleSheetsService()
        self.reporter = ReporterService()
        
        keywords_str = os.getenv(
            "SEARCH_KEYWORDS", 
            "startup funding,startup news,venture capital news,seed round,series A,startup investments,fundraising announcements"
        )
        self.keywords = [kw.strip() for kw in keywords_str.split(",") if kw.strip()]

    def run(self) -> Dict[str, Any]:
        """Runs the entire pipeline workflow."""
        logger.info("Starting Startup Discovery Pipeline Run...")
        stats = {
            "start_time": datetime.datetime.utcnow().isoformat(),
            "videos_found": 0,
            "videos_processed": 0,
            "videos_ignored": 0,
            "videos_failed": 0,
            "startups_discovered": 0,
            "sheets_synced": 0,
            "report_path": None
        }

        # Check if we should only scan the configured channels
        only_scan_channels = os.getenv("ONLY_SCAN_CHANNELS", "false").lower() == "true"
        if only_scan_channels:
            logger.info("ONLY_SCAN_CHANNELS is set to true. Skipping broad YouTube search.")
            videos = self.youtube.search_videos([])
        else:
            videos = self.youtube.search_videos(self.keywords)
            
        stats["videos_found"] = len(videos)
        logger.info(f"Discovered {len(videos)} potential videos to scan.")

        discovered_startups_batch = []

        with get_db() as db:
            for video in videos:
                video_id = video["video_id"]
                title = video["title"]
                
                existing_video = db.query(ProcessedVideo).filter_by(video_id=video_id).first()
                if existing_video:
                    logger.info(f"Video {video_id} ('{title}') already processed in a previous run. Skipping.")
                    continue

                logger.info(f"Processing video {video_id}: '{title}'")
                transcript_text = None
                method_used = "subtitle_api"

                transcript_data = self.transcription.get_transcript(video_id)
                if transcript_data:
                    last_30_text = self.transcription.get_last_30_percent(transcript_data)
                    
                    if not self.extractor.scan_for_funding_keywords(last_30_text):
                        logger.info(f"No funding keywords found in last 30% of video {video_id}. Ignoring video.")
                        ignored_video = ProcessedVideo(
                            video_id=video_id,
                            title=title,
                            url=video["url"],
                            channel=video["channel"],
                            duration=video["duration"],
                            upload_date=video["upload_date"],
                            status="ignored"
                        )
                        db.add(ignored_video)
                        stats["videos_ignored"] += 1
                        continue
                        
                    transcript_text = self.transcription.get_full_text(transcript_data)
                else:
                    # Safeguard: Verify if the title is relevant or if the video is too long before running fallback audio STT (saves Gemini API cost & download time)
                    title_lower = title.lower()
                    funding_indicators = [
                        "raise", "fund", "invest", "round", "seed", "series", "crore", "lakh", 
                        "deal", "unicorn", "acquire", "acquisition", "backer", "valuation", "yc", "y combinator"
                    ]
                    has_funding_in_title = any(indicator in title_lower for indicator in funding_indicators)
                    duration_limit = 1500 # 25 minutes limit
                    is_too_long = video.get("duration") and video.get("duration") > duration_limit
                    
                    if not has_funding_in_title or is_too_long:
                        reason = "title does not match funding keywords" if not has_funding_in_title else f"video is too long ({video.get('duration')}s)"
                        logger.info(f"Skipping fallback audio speech-to-text for video {video_id} because {reason}.")
                        
                        # Add to database as ignored to prevent repeated checks
                        ignored_video = ProcessedVideo(
                            video_id=video_id,
                            title=title,
                            url=video["url"],
                            channel=video["channel"],
                            duration=video["duration"],
                            upload_date=video["upload_date"],
                            status="ignored"
                        )
                        db.add(ignored_video)
                        stats["videos_ignored"] += 1
                        continue

                    logger.info(f"No automatic transcript. Title matches funding terms. Running audio speech-to-text fallback for {video_id}...")
                    try:
                        transcript_text = self.transcription.generate_transcript_fallback(video_id)
                        method_used = "audio_speech_to_text"
                    except Exception as fallback_err:
                        logger.error(f"Fallback transcription error for {video_id}: {fallback_err}")
                
                if not transcript_text:
                    logger.warning(f"Could not retrieve transcript for video {video_id}. Marking as error.")
                    error_video = ProcessedVideo(
                        video_id=video_id,
                        title=title,
                        url=video["url"],
                        channel=video["channel"],
                        duration=video["duration"],
                        upload_date=video["upload_date"],
                        status="error"
                    )
                    db.add(error_video)
                    stats["videos_failed"] += 1
                    continue

                try:
                    logger.info(f"Running LLM extraction on video {video_id} using {method_used}...")
                    extracted_startups = self.extractor.extract_startups(transcript_text)
                    logger.info(f"LLM extracted {len(extracted_startups)} startup mentions from {video_id}.")
                    
                    startups_saved = 0
                    
                    for estartup in extracted_startups:
                        startup_name = estartup.startup_name.strip()
                        if not startup_name:
                            continue
                            
                        existing_startup = db.query(Startup).filter(Startup.name.ilike(startup_name)).first()
                        if existing_startup:
                            logger.info(f"Startup '{startup_name}' is already in database. Skipping duplicate.")
                            continue

                        verification = self.verifier.verify_startup_funding(
                            startup_name=startup_name,
                            round_name=estartup.funding_round,
                            amount=estartup.funding_amount
                        )
                        
                        web_weight = 0.6 if verification.is_verified else 0.3
                        final_confidence = (estartup.confidence_score * 0.4) + (verification.adjusted_confidence * web_weight)
                        final_confidence = min(max(final_confidence, 0.0), 1.0)
                        
                        new_startup = Startup(
                            name=startup_name,
                            website=estartup.website or verification.summary if not estartup.website else estartup.website,
                            funding_amount=estartup.funding_amount,
                            funding_amount_numeric=estartup.funding_amount_numeric,
                            funding_round=estartup.funding_round,
                            investors=estartup.investors,
                            industry=estartup.industry,
                            source_video_url=video["url"],
                            timestamp=estartup.timestamp,
                            upload_date=video["upload_date"],
                            confidence_score=final_confidence,
                            verification_sources=verification.verification_sources
                        )
                        db.add(new_startup)
                        db.flush()
                        
                        discovered_startups_batch.append(new_startup.to_dict())
                        startups_saved += 1
                        stats["startups_discovered"] += 1

                    processed_video = ProcessedVideo(
                        video_id=video_id,
                        title=title,
                        url=video["url"],
                        channel=video["channel"],
                        duration=video["duration"],
                        upload_date=video["upload_date"],
                        status="processed"
                    )
                    db.add(processed_video)
                    stats["videos_processed"] += 1
                    logger.info(f"Completed processing video {video_id}. Saved {startups_saved} startups.")

                except Exception as ext_err:
                    logger.error(f"Failed to run extraction/verification for video {video_id}: {ext_err}")
                    error_video = ProcessedVideo(
                        video_id=video_id,
                        title=title,
                        url=video["url"],
                        channel=video["channel"],
                        duration=video["duration"],
                        upload_date=video["upload_date"],
                        status="error"
                    )
                    db.add(error_video)
                    stats["videos_failed"] += 1

        if discovered_startups_batch:
            try:
                synced_count = self.sheets.sync_startups(discovered_startups_batch)
                stats["sheets_synced"] = synced_count
            except Exception as sheet_err:
                logger.error(f"Google Sheets sync failed: {sheet_err}")

        if discovered_startups_batch:
            try:
                report_path = self.reporter.generate_daily_report(discovered_startups_batch)
                stats["report_path"] = report_path
            except Exception as rep_err:
                logger.error(f"Failed to generate daily report: {rep_err}")

        stats["end_time"] = datetime.datetime.utcnow().isoformat()
        logger.info(f"Pipeline Run Completed! Stats: {stats}")
        return stats
