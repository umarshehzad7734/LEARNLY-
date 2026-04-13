from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
from beanie import Document, Link, PydanticObjectId
from pydantic import Field
import enum

class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"

class ChatSession(Document):
    user_id: PydanticObjectId
    course_id: PydanticObjectId
    title: str = "New Chat"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "chat_sessions"
        indexes = [
            "user_id",
            "course_id",
            [("user_id", 1), ("course_id", 1)]
        ]

class ChatHistory(Document):
    session_id: Optional[PydanticObjectId] = None
    user_id: PydanticObjectId
    course_id: PydanticObjectId
    role: MessageRole
    content: str
    
    # Optional fields for assistant responses
    sources: Optional[List[Any]] = None
    confidence: Optional[float] = None
    material_ids: Optional[List[str]] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Settings:
        name = "chat_history"
        indexes = [
            "session_id",
            "user_id",
            "course_id",
            "created_at"
        ]
