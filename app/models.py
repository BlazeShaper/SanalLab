"""
SQLAlchemy ORM models.
"""
import uuid
import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime, Boolean
from app.db import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class ReportItem(Base):
    __tablename__ = "report_items"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, index=True, nullable=False)
    expression = Column(String, nullable=False, default="coulomb")
    label = Column(String, nullable=False)
    q1 = Column(Float, nullable=False, default=0.0)
    q2 = Column(Float, nullable=False, default=0.0)
    r = Column(Float, nullable=False, default=1.0)
    force = Column(Float, nullable=False, default=0.0)
    order_index = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=_now)


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, default=_uuid)
    session_id = Column(String, index=True, nullable=False)
    original_name = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size = Column(Integer, nullable=False, default=0)
    path = Column(String, nullable=False)
    is_public = Column(Boolean, default=False)
    public_token = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime, default=_now)
