from pydantic import BaseModel
from typing import List, Optional

class RAGQueryRequest(BaseModel):
    query: str
    course_id: str
    session_id: Optional[str] = None
    model_provider: Optional[str] = "groq"  # 'groq' or 'ollama'
    conversation_history: Optional[List[dict]] = []
    material_ids: Optional[List[str]] = None  # Specific materials to query from

class SourceDocument(BaseModel):
    content: str
    page: Optional[int] = None
    score: float
    metadata: dict

class RAGQueryResponse(BaseModel):
    answer: str
    session_id: Optional[str] = None
    sources: List[SourceDocument]
    confidence: float
    moderation_passed: bool
    moderation_warnings: List[str] = []

class UploadMaterialRequest(BaseModel):
    course_id: str
    title: str
