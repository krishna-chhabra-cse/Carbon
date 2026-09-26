"""
storage/models.py — SQLAlchemy models for analysis history and audit trail.
Uses SQLite for development, PostgreSQL for production.
"""

import os
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./carbon_history.db")


class Base(DeclarativeBase):
    pass


class AnalysisRecord(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    repo_url = Column(String(500), index=True)
    workspace_name = Column(String(200), nullable=True)
    security_grade = Column(String(2))
    findings_count = Column(Integer, default=0)
    token_reduction_pct = Column(Float, nullable=True)
    raw_files_count = Column(Integer, default=0)
    optimized_files_count = Column(Integer, default=0)
    analysis_duration_ms = Column(Float, nullable=True)
    result_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Initialize engine and session
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)


def init_db():
    """Creates all tables. Safe to call multiple times."""
    Base.metadata.create_all(bind=engine)


def save_analysis(repo_url: str, security_grade: str, findings_count: int, **kwargs):
    """Saves an analysis record to the database."""
    session = SessionLocal()
    try:
        record = AnalysisRecord(
            repo_url=repo_url,
            security_grade=security_grade,
            findings_count=findings_count,
            **kwargs
        )
        session.add(record)
        session.commit()
        return record.id
    finally:
        session.close()
