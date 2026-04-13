from beanie import Document, Indexed
from pydantic import Field
from typing import Optional, Dict
from datetime import datetime, timezone

class ModerationSettings(Document):
    category: Indexed(str, unique=True) # hate, violence, weapons, religion, safety, health
    threshold: float = 0.7
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "moderation_settings"
        use_state_management = True

class ModerationLog(Document):
    content: str
    category: str
    confidence: float
    flagged: bool = False
    action_taken: Optional[str] = None  # blocked, warned, allowed
    meta_data: Dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "moderation_logs"
        use_state_management = True
