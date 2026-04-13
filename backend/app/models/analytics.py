from beanie import Document, PydanticObjectId, Indexed
from pydantic import Field
from typing import Optional, Dict
from datetime import datetime, timezone

class UserAnalytics(Document):
    user_id: Indexed(PydanticObjectId, unique=True)
    total_quizzes_taken: int = 0
    average_score: float = 0.0
    total_time_spent: int = 0  # in minutes
    courses_enrolled: int = 0
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    skill_mastery: Dict[str, float] = {}  # {"topic": mastery_level}
    engagement_score: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_analytics"
        use_state_management = True

class CourseAnalytics(Document):
    course_id: Indexed(PydanticObjectId, unique=True)
    total_enrollments: int = 0
    average_progress: float = 0.0
    average_quiz_score: float = 0.0
    completion_rate: float = 0.0
    ai_interactions: int = 0
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "course_analytics"
        use_state_management = True
