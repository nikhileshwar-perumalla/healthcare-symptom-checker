from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import uuid
from datetime import datetime

from database import init_db, get_db, SymptomQuery
from models import (
    SymptomInput, SymptomResponse, Condition, Recommendation,
    QueryHistory, HealthResponse
)
from llm_service import llm_service

app = FastAPI(
    title="Healthcare Symptom Checker API",
    description="Educational symptom analysis API using LLM",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDICAL_DISCLAIMER = """
⚠️ IMPORTANT MEDICAL DISCLAIMER ⚠️

This symptom checker is for EDUCATIONAL PURPOSES ONLY and should NOT be used as a substitute for professional medical advice, diagnosis, or treatment.

- This tool does not provide medical advice
- Always seek the advice of your physician or other qualified health provider
- Never disregard professional medical advice or delay seeking it because of information from this tool
- If you think you may have a medical emergency, call your doctor or emergency services immediately

This service is not intended to diagnose, treat, cure, or prevent any disease.
"""


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()


@app.get("/", response_model=HealthResponse)
async def root():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="Healthcare Symptom Checker API is running"
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        message="API is operational"
    )


@app.post("/api/check-symptoms", response_model=SymptomResponse)
async def check_symptoms(
    symptom_input: SymptomInput,
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze symptoms and provide probable conditions with recommendations
    
    This endpoint uses LLM to analyze patient symptoms and provide educational
    information about possible conditions and recommended next steps.
    """
    try:
        # Analyze symptoms using LLM
        llm_response = await llm_service.analyze_symptoms(
            symptoms=symptom_input.symptoms,
            age=symptom_input.age,
            gender=symptom_input.gender
        )
        
        # Parse LLM response
        conditions = [Condition(**c) for c in llm_response.get("probable_conditions", [])]
        recommendations = [Recommendation(**r) for r in llm_response.get("recommendations", [])]
        emergency_warning = llm_response.get("emergency_warning")
        
        # Create response
        response = SymptomResponse(
            probable_conditions=conditions,
            recommendations=recommendations,
            disclaimer=MEDICAL_DISCLAIMER,
            emergency_warning=emergency_warning
        )
        
        # Save to database
        session_id = symptom_input.session_id or str(uuid.uuid4())
        db_query = SymptomQuery(
            symptoms=symptom_input.symptoms,
            response=json.dumps({
                "probable_conditions": [c.dict() for c in conditions],
                "recommendations": [r.dict() for r in recommendations],
                "emergency_warning": emergency_warning
            }),
            conditions=json.dumps([c.dict() for c in conditions]),
            recommendations=json.dumps([r.dict() for r in recommendations]),
            session_id=session_id
        )
        
        db.add(db_query)
        await db.commit()
        await db.refresh(db_query)
        
        response.query_id = db_query.id
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing symptoms: {str(e)}"
        )


@app.get("/api/history", response_model=list[QueryHistory])
async def get_history(
    limit: int = 10,
    session_id: str = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve query history
    
    Args:
        limit: Maximum number of records to return (default: 10)
        session_id: Filter by session ID (optional)
    """
    try:
        query = select(SymptomQuery).order_by(SymptomQuery.created_at.desc()).limit(limit)
        
        if session_id:
            query = query.where(SymptomQuery.session_id == session_id)
        
        result = await db.execute(query)
        queries = result.scalars().all()
        
        history = []
        for q in queries:
            conditions = json.loads(q.conditions) if q.conditions else []
            conditions_summary = ", ".join([c.get("name", "Unknown") for c in conditions[:3]])
            if len(conditions) > 3:
                conditions_summary += f" and {len(conditions) - 3} more"
            
            history.append(QueryHistory(
                id=q.id,
                symptoms=q.symptoms[:100] + "..." if len(q.symptoms) > 100 else q.symptoms,
                created_at=q.created_at,
                conditions_summary=conditions_summary or "No conditions identified"
            ))
        
        return history
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving history: {str(e)}"
        )


@app.get("/api/query/{query_id}", response_model=SymptomResponse)
async def get_query(query_id: int, db: AsyncSession = Depends(get_db)):
    """Retrieve a specific query by ID"""
    try:
        query = select(SymptomQuery).where(SymptomQuery.id == query_id)
        result = await db.execute(query)
        db_query = result.scalar_one_or_none()
        
        if not db_query:
            raise HTTPException(status_code=404, detail="Query not found")
        
        response_data = json.loads(db_query.response)
        
        return SymptomResponse(
            probable_conditions=[Condition(**c) for c in response_data.get("probable_conditions", [])],
            recommendations=[Recommendation(**r) for r in response_data.get("recommendations", [])],
            disclaimer=MEDICAL_DISCLAIMER,
            emergency_warning=response_data.get("emergency_warning"),
            query_id=db_query.id,
            timestamp=db_query.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving query: {str(e)}"
        )


@app.get("/api/disclaimer")
async def get_disclaimer():
    """Get the medical disclaimer"""
    return {"disclaimer": MEDICAL_DISCLAIMER}


if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
