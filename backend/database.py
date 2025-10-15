from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./symptom_checker.db")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()


class SymptomQuery(Base):
    """Database model for storing symptom queries and responses"""
    __tablename__ = "symptom_queries"
    
    id = Column(Integer, primary_key=True, index=True)
    symptoms = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    conditions = Column(Text)  # JSON string of probable conditions
    recommendations = Column(Text)  # JSON string of recommendations
    created_at = Column(DateTime, default=datetime.utcnow)
    session_id = Column(String, index=True)  # For grouping related queries


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        yield session
