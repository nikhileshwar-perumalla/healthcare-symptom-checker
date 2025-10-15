from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime


class SymptomInput(BaseModel):
    """Input model for symptom checker"""
    symptoms: str = Field(..., min_length=3, max_length=2000, description="Description of symptoms")
    age: Optional[int] = Field(None, ge=0, le=120, description="Patient age (optional)")
    gender: Optional[str] = Field(None, description="Patient gender (optional)")
    session_id: Optional[str] = Field(None, description="Session ID for tracking related queries")
    
    @validator('symptoms')
    def validate_symptoms(cls, v):
        if not v.strip():
            raise ValueError('Symptoms cannot be empty')
        return v.strip()


class Condition(BaseModel):
    """Model for a probable medical condition"""
    name: str
    probability: str  # e.g., "High", "Medium", "Low"
    description: str
    common_symptoms: List[str]


class Recommendation(BaseModel):
    """Model for medical recommendations"""
    category: str  # e.g., "Immediate Action", "Self-Care", "Follow-up"
    action: str
    priority: str  # e.g., "High", "Medium", "Low"


class SymptomResponse(BaseModel):
    """Response model for symptom analysis"""
    probable_conditions: List[Condition]
    recommendations: List[Recommendation]
    disclaimer: str
    emergency_warning: Optional[str] = None
    query_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class QueryHistory(BaseModel):
    """Model for query history"""
    id: int
    symptoms: str
    created_at: datetime
    conditions_summary: str
    
    class Config:
        from_attributes = True


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    message: str
