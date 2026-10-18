"""
Migration: Add email column to lead_profiles table
===================================================
Run this once after pulling the Hunter.io integration update.

    python add_email_column.py

Safe to re-run — checks if column already exists before adding it.
"""

import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# Allow running from any directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import engine


from sqlalchemy import inspect, text


def run_migration():
    with engine.connect() as conn:
        inspector = inspect(conn)
        tables = inspector.get_table_names()
        if "lead_profiles" not in tables:
            logger.info("Table 'lead_profiles' does not exist yet. Run init_db() first.")
            return

        columns = [col["name"] for col in inspector.get_columns("lead_profiles")]
        if "email" in columns:
            logger.info("Column 'email' already exists in lead_profiles — nothing to do.")
        else:
            logger.info("Adding column 'email' to lead_profiles ...")
            conn.execute(
                text("ALTER TABLE lead_profiles ADD COLUMN email VARCHAR(255)")
            )
            conn.commit()
            logger.info("✅ Migration complete — 'email' column added to lead_profiles.")


if __name__ == "__main__":
    run_migration()
