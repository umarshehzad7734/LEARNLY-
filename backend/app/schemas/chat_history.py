from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ChatMessageResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    role: str
    content: str
    sources: Optional[List[dict]] = None
    confidence: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    course_id: str

    class Config:
        from_attributes = True

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]
    total: int

class CreateSessionRequest(BaseModel):
    course_id: str
    title: Optional[str] = "New Chat"

class UpdateSessionRequest(BaseModel):
    title: str
