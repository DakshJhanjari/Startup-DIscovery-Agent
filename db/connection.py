import os
from contextlib import contextmanager
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, session

from db.models import Base

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///startups.db")

# For SQLite, check if we need to enable multithreading checks
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initializes the database tables and runs lightweight column migrations."""
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate newly added columns for SQLite
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check lead_profiles columns
            try:
                result = conn.execute(text("PRAGMA table_info(lead_profiles)"))
                columns = [row[1] for row in result.fetchall()]
                if "email_drafted" not in columns:
                    conn.execute(text("ALTER TABLE lead_profiles ADD COLUMN email_drafted BOOLEAN DEFAULT 0"))
                if "email_drafted_at" not in columns:
                    conn.execute(text("ALTER TABLE lead_profiles ADD COLUMN email_drafted_at DATETIME"))
                conn.commit()
            except Exception:
                pass

@contextmanager
def get_db():
    """Provide a transactional scope around a series of operations."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
