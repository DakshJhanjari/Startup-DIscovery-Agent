import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class ProcessedVideo(Base):
    __tablename__ = 'processed_videos'
    
    video_id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    url = Column(String(255), nullable=False)
    channel = Column(String(100), nullable=True)
    duration = Column(Integer, nullable=True) # Duration in seconds
    upload_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="processed") # e.g., "discovered", "processed", "ignored", "error"
    processed_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "video_id": self.video_id,
            "title": self.title,
            "url": self.url,
            "channel": self.channel,
            "duration": self.duration,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "status": self.status,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None
        }

class Startup(Base):
    __tablename__ = 'startups'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    website = Column(String(255), nullable=True)
    funding_amount = Column(String(100), nullable=True) # Text to support ranges / multiple currencies (e.g., "$5M", "€2.3M")
    funding_amount_numeric = Column(Float, nullable=True) # Standardized numeric value in USD for sorting and aggregation
    funding_round = Column(String(50), nullable=True) # e.g., "Seed", "Series A"
    investors = Column(JSON, nullable=True) # List of investor names: ["Y Combinator", "Sequoia"]
    industry = Column(String(100), nullable=True)
    source_video_url = Column(String(255), nullable=True)
    source = Column(String(50), default="youtube")  # "youtube", "inc42", "manual"
    timestamp = Column(String(20), nullable=True) # e.g., "12:34" where it's mentioned
    upload_date = Column(DateTime, nullable=True) # Video upload date
    confidence_score = Column(Float, default=0.0) # Score out of 1.0
    verification_sources = Column(JSON, nullable=True) # List of verification URLs or sources
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "website": self.website,
            "funding_amount": self.funding_amount,
            "funding_amount_numeric": self.funding_amount_numeric,
            "funding_round": self.funding_round,
            "investors": self.investors or [],
            "industry": self.industry,
            "source_video_url": self.source_video_url or "",
            "source": self.source or "youtube",
            "timestamp": self.timestamp,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "confidence_score": self.confidence_score,
            "verification_sources": self.verification_sources or [],
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class SharkTankStartup(Base):
    __tablename__ = 'shark_tank_startups'

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    season = Column(Integer, nullable=True)
    episode = Column(Integer, nullable=True)
    sector = Column(String(100), nullable=True)
    ask_amount = Column(String(100), nullable=True)
    ask_amount_numeric = Column(Float, nullable=True)
    deal_amount = Column(String(100), nullable=True)
    deal_amount_numeric = Column(Float, nullable=True)
    equity_pct = Column(Float, nullable=True)
    sharks = Column(JSON, nullable=True)
    deal_made = Column(Boolean, default=False)
    website = Column(String(255), nullable=True)
    founded_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "season": self.season,
            "episode": self.episode,
            "sector": self.sector,
            "ask_amount": self.ask_amount,
            "ask_amount_numeric": self.ask_amount_numeric,
            "deal_amount": self.deal_amount,
            "deal_amount_numeric": self.deal_amount_numeric,
            "equity_pct": self.equity_pct,
            "sharks": self.sharks or [],
            "deal_made": bool(self.deal_made),
            "website": self.website,
            "founded_year": self.founded_year,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
