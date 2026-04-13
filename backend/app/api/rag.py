from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Optional
from datetime import datetime, timezone
import os
from pathlib import Path

from app.core.security import get_current_user
from app.models.user import User
from beanie import PydanticObjectId
from app.models.course import Course, CourseEnrollment
from app.models.analytics import CourseAnalytics
from app.models.chat_history import ChatHistory, ChatSession
from app.schemas.rag import RAGQueryRequest, RAGQueryResponse
from app.schemas.chat_history import ChatMessageResponse, ChatHistoryResponse, ChatSessionResponse, CreateSessionRequest, UpdateSessionRequest
from app.services.rag_service import rag_service
# from app.services.ollama_service import ollama_service (Removed)

router = APIRouter()

@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(
    request: RAGQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Query the RAG system for course-specific questions"""
    # Check course access
    course = await Course.get(PydanticObjectId(request.course_id))
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check enrollment for students
    if current_user.role == "student":
        enrollment = await CourseEnrollment.find_one(
            CourseEnrollment.course_id == course.id,
            CourseEnrollment.student_id == current_user.id
        )
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enrolled in this course"
            )
    # Check teacher authorization
    elif current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to query this course"
        )
    
    # Handle session
    session_id = None
    if request.session_id:
        try:
            # Validate ID format first
            session_oid = PydanticObjectId(request.session_id)
            session = await ChatSession.find_one(
                ChatSession.id == session_oid,
                ChatSession.user_id == current_user.id
            )
            if not session:
                # Create new if not found
                session = ChatSession(
                    user_id=current_user.id,
                    course_id=course.id,
                    title=request.query[:50] + "..." if len(request.query) > 50 else request.query
                )
                await session.create()
                session_id = session.id
            else:
                session_id = session.id
        except Exception:
            # Invalid ID format or other error -> treat as new session
            print(f"Invalid session_id provided: {request.session_id}. Creating new session.")
            session = ChatSession(
                user_id=current_user.id,
                course_id=course.id,
                title=request.query[:50] + "..." if len(request.query) > 50 else request.query
            )
            await session.create()
            session_id = session.id
    else:
        # Create new
        session = ChatSession(
            user_id=current_user.id,
            course_id=course.id,
            title=request.query[:50] + "..." if len(request.query) > 50 else request.query
        )
        await session.create()
        session_id = session.id

    # Add previous messages
    session_history = []
    if session_id:
        prev_messages = await ChatHistory.find(
            ChatHistory.session_id == session_id
        ).sort("-created_at").limit(5).to_list()
        
        # Reverse to chronologial
        for msg in reversed(prev_messages):
            session_history.append({"role": msg.role, "content": msg.content})

    # Query RAG system
    result = await rag_service.query(
        query=request.query,
        course_id=str(request.course_id),
        conversation_history=session_history,
        material_ids=request.material_ids,
        model_provider=request.model_provider
    )
    
    # Save user message
    user_message = ChatHistory(
        session_id=session_id,
        user_id=current_user.id,
        course_id=course.id,
        role="user",
        content=request.query,
        material_ids=request.material_ids
    )
    await user_message.create()
    
    # Save assistant message
    assistant_message = ChatHistory(
        session_id=session_id,
        user_id=current_user.id,
        course_id=course.id,
        role="assistant",
        content=result["answer"],
        sources=result.get("sources"),
        confidence=result.get("confidence"),
        material_ids=request.material_ids
    )
    await assistant_message.create()
    
    # Update session
    session = await ChatSession.get(session_id)
    if session:
        session.updated_at = datetime.now(timezone.utc)
        await session.save()
    
    # Update analytics
    analytics = await CourseAnalytics.find_one(CourseAnalytics.course_id == course.id)
    if analytics:
        analytics.ai_interactions += 1
        await analytics.save()
    
    # Response
    response_dict = result.copy()
    response_dict["session_id"] = str(session_id)
    # The response model likely expects snake_case, but let's check
    # Pydantic models usually filter extra fields, so passing result directly is fine if keys match
    
    return RAGQueryResponse(**response_dict)

@router.get("/health")
async def check_rag_health():
    """Check RAG system health with real diagnostics"""
    details = {}

    # Vector store diagnostics
    try:
        path = rag_service.vector_store_path
        exists = path.exists()
        writable = False
        if exists:
            try:
                import uuid
                test_file = path / f".healthcheck_{uuid.uuid4().hex}"
                with open(test_file, "w", encoding="utf-8") as f:
                    f.write("ok")
                writable = True
            finally:
                try:
                    test_file.unlink()
                except Exception:
                    pass
        index_count = len(list(path.glob("*.index"))) if exists else 0
        details["vector_store"] = {
            "path": str(path),
            "exists": exists,
            "writable": writable,
            "indexes": index_count,
        }
    except Exception as e:
        details["vector_store"] = {"error": str(e)}

    # Overall status
    status = "healthy"
    if not details.get("vector_store", {}).get("exists") or not details.get("vector_store", {}).get("writable"):
        status = "degraded"

    return {"status": status, **details}

@router.get("/sessions/{course_id}", response_model=List[ChatSessionResponse])
async def get_sessions(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get all chat sessions for a course"""
    sessions = await ChatSession.find(
        ChatSession.course_id == course_id,
        ChatSession.user_id == current_user.id
    ).sort("-updated_at").to_list()
    
    # Serialize ObjectIds to strings
    session_responses = []
    for s in sessions:
        s_dict = s.dict()
        s_dict["id"] = str(s.id)
        s_dict["user_id"] = str(s.user_id)
        s_dict["course_id"] = str(s.course_id)
        session_responses.append(s_dict)
    
    return session_responses

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_new_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_user)
):
    """Create a new empty chat session"""
    session = ChatSession(
        course_id=PydanticObjectId(request.course_id),
        user_id=current_user.id,
        title=request.title or "New Chat"
    )
    await session.create()
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    session = await ChatSession.find_one(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    await session.delete()
    return {"status": "success"}

@router.get("/history/{session_id}", response_model=ChatHistoryResponse)
async def get_session_history(
    session_id: PydanticObjectId,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get chat history for a specific session"""
    session = await ChatSession.find_one(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied"
        )
    
    # Get chat history
    messages = await ChatHistory.find(
        ChatHistory.session_id == session_id
    ).sort("created_at").limit(limit).to_list()
    
    # Manually serialize to handle ObjectId -> str conversion
    message_responses = []
    for msg in messages:
        msg_dict = msg.dict()
        msg_dict["id"] = str(msg.id) if msg.id else None
        msg_dict["session_id"] = str(msg.session_id) if msg.session_id else None
        message_responses.append(msg_dict)
    
    return ChatHistoryResponse(
        messages=message_responses,
        total=len(messages)
    )
