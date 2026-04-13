from beanie import Document
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"

class User(Document):
    email: str = Field(unique=True)  # Beanie handles index via Sync/Settings
    hashed_password: Optional[str] = None
    full_name: str
    role: UserRole = UserRole.student
    avatar: Optional[str] = None
    is_active: bool = True
    is_verified: bool = False
    google_id: Optional[str] = None
    
    # Student-specific fields
    semester: Optional[int] = None
    degree_type: Optional[str] = None
    competency_score: int = 50
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        use_state_management = True

