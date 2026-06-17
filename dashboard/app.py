import os
import datetime
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import func

from db.connection import get_db, init_db
from db.models import Startup, ProcessedVideo, SharkTankStartup
from pipeline import PipelineRunner
from scheduler import PipelineScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

init_db()

app = FastAPI(
    title="Startup Funding Discovery Dashboard",
    description="API and UI dashboard for exploring recently discovered startup funding rounds."
)

runner = PipelineRunner()
scheduler = PipelineScheduler()

@app.on_event("startup")
def startup_event():
    logger.info("FastAPI dashboard starting up. Launching scheduler...")
    scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    logger.info("FastAPI dashboard shutting down. Stopping scheduler...")
    scheduler.shutdown()

is_pipeline_running = False

def run_pipeline_task():
    global is_pipeline_running
    is_pipeline_running = True
    try:
        runner.run()
    except Exception as e:
        logger.error(f"Background pipeline run failed: {e}")
    finally:
        is_pipeline_running = False

@app.post("/api/run-pipeline")
def trigger_pipeline(background_tasks: BackgroundTasks):
    """Triggers the startup discovery pipeline execution in the background."""
    global is_pipeline_running
    if is_pipeline_running:
        return {"status": "running", "message": "Pipeline is already running in the background."}
    
    background_tasks.add_task(run_pipeline_task)
    return {"status": "started", "message": "Pipeline run started in the background."}

@app.get("/api/pipeline-status")
def get_pipeline_status():
    """Returns whether the pipeline is currently running."""
    return {"status": "running" if is_pipeline_running else "idle"}

@app.get("/api/summary")
def get_summary_metrics():
    """Gathers aggregated metrics for the dashboard cards and charts."""
    with get_db() as db:
        today = datetime.datetime.utcnow().date()
        start_of_today = datetime.datetime.combine(today, datetime.time.min)
        
        new_today_count = db.query(Startup).filter(Startup.created_at >= start_of_today).count()
        total_count = db.query(Startup).count()
        
        total_funding_res = db.query(func.sum(Startup.funding_amount_numeric)).scalar()
        total_funding = total_funding_res if total_funding_res is not None else 0.0
        
        videos_processed = db.query(ProcessedVideo).filter(ProcessedVideo.status == "processed").count()
        videos_ignored = db.query(ProcessedVideo).filter(ProcessedVideo.status == "ignored").count()
        videos_failed = db.query(ProcessedVideo).filter(ProcessedVideo.status == "error").count()
        
        round_counts = db.query(Startup.funding_round, func.count(Startup.id))\
            .group_by(Startup.funding_round).all()
        round_data = {r: count for r, count in round_counts if r}
        
        all_startups = db.query(Startup).all()
        investor_counts = {}
        for s in all_startups:
            investors = s.investors
            if isinstance(investors, list):
                for inv in investors:
                    inv = inv.strip()
                    if inv:
                        investor_counts[inv] = investor_counts.get(inv, 0) + 1
            elif isinstance(investors, str) and investors:
                for inv in investors.split(","):
                    inv = inv.strip()
                    if inv:
                        investor_counts[inv] = investor_counts.get(inv, 0) + 1
                        
        sorted_investors = sorted(investor_counts.items(), key=lambda x: x[1], reverse=True)
        top_investors = [{"name": name, "count": count} for name, count in sorted_investors[:10]]

        return {
            "new_today": new_today_count,
            "total_startups": total_count,
            "total_funding_usd": total_funding,
            "videos_scanned": videos_processed + videos_ignored + videos_failed,
            "videos_processed": videos_processed,
            "videos_ignored": videos_ignored,
            "videos_failed": videos_failed,
            "rounds_breakdown": round_data,
            "active_investors": top_investors
        }

@app.get("/api/startups")
def get_startups(
    search: str = Query(None, description="Search by name, investors, or industry"),
    round_filter: str = Query(None, description="Filter by funding round"),
    source_filter: str = Query(None, description="Filter by source: 'youtube', 'inc42'"),
    min_confidence: float = Query(None, description="Filter by minimum confidence score"),
    sort_by: str = Query("date", description="Sort by 'date', 'amount', or 'confidence'"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100)
):
    """Retrieves a paginated list of startups with search, filter, and sort capabilities."""
    with get_db() as db:
        query = db.query(Startup)
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                (Startup.name.like(search_pattern)) |
                (Startup.industry.like(search_pattern)) |
                (Startup.funding_round.like(search_pattern))
            )
            
        if round_filter:
            query = query.filter(Startup.funding_round == round_filter)

        if source_filter:
            query = query.filter(Startup.source == source_filter)
            
        if min_confidence is not None:
            query = query.filter(Startup.confidence_score >= min_confidence)
            
        if sort_by == "amount":
            sort_column = Startup.funding_amount_numeric
        elif sort_by == "confidence":
            sort_column = Startup.confidence_score
        else:
            sort_column = Startup.upload_date
            
        if order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
            
        total = query.count()
        offset = (page - 1) * limit
        startups = query.offset(offset).limit(limit).all()
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "data": [s.to_dict() for s in startups]
        }

static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
else:
    logger.warning("Static directory not found. Serving API endpoints only.")


@app.get("/api/shark-tank")
def get_shark_tank_startups(
    season: int = Query(None, description="Filter by season (1-4)"),
    shark: str = Query(None, description="Filter by shark name"),
    sector: str = Query(None, description="Filter by sector"),
    deal_made: bool = Query(None, description="Filter by whether a deal was made"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """Returns paginated Shark Tank India startup data."""
    with get_db() as db:
        query = db.query(SharkTankStartup)

        if season is not None:
            query = query.filter(SharkTankStartup.season == season)
        if sector:
            query = query.filter(SharkTankStartup.sector.ilike(f"%{sector}%"))
        if deal_made is not None:
            query = query.filter(SharkTankStartup.deal_made == (1 if deal_made else 0))

        all_items = query.all()

        # Shark filter (JSON list field)
        if shark:
            all_items = [
                s for s in all_items
                if s.sharks and any(shark.lower() in sh.lower() for sh in s.sharks)
            ]

        total = len(all_items)
        offset = (page - 1) * limit
        page_items = all_items[offset: offset + limit]

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit,
            "data": [s.to_dict() for s in page_items]
        }


@app.get("/api/shark-tank/summary")
def get_shark_tank_summary():
    """Returns summary stats for the Shark Tank India tab."""
    with get_db() as db:
        total = db.query(SharkTankStartup).count()
        deals_made = db.query(SharkTankStartup).filter(SharkTankStartup.deal_made == 1).count()

        # Sharks leaderboard
        all_items = db.query(SharkTankStartup).filter(SharkTankStartup.deal_made == 1).all()
        shark_counts = {}
        for item in all_items:
            for sh in (item.sharks or []):
                shark_counts[sh] = shark_counts.get(sh, 0) + 1
        top_sharks = sorted(shark_counts.items(), key=lambda x: x[1], reverse=True)

        # Sector breakdown
        sector_counts = {}
        for item in db.query(SharkTankStartup).all():
            s = item.sector or "Unknown"
            sector_counts[s] = sector_counts.get(s, 0) + 1

        # Season breakdown
        season_counts = {}
        for item in db.query(SharkTankStartup).all():
            key = f"Season {item.season}" if item.season else "Unknown"
            season_counts[key] = season_counts.get(key, 0) + 1

        return {
            "total_startups": total,
            "deals_made": deals_made,
            "no_deal": total - deals_made,
            "deal_rate_pct": round((deals_made / total * 100) if total else 0, 1),
            "top_sharks": [{"name": n, "deals": c} for n, c in top_sharks[:8]],
            "sector_breakdown": sector_counts,
            "season_breakdown": season_counts,
        }

