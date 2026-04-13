from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime
from beanie import PydanticObjectId
from app.schemas.base import PyObjectId

class UserAnalyticsResponse(BaseModel):
    id: PyObjectId
    user_id: PyObjectId
    total_quizzes_taken: int
    average_score: float
    total_time_spent: int
    courses_enrolled: int
    last_activity: datetime
    skill_mastery: Dict
    engagement_score: float

    class Config:
        from_attributes = True

class CourseAnalyticsResponse(BaseModel):
    id: PyObjectId
    course_id: PyObjectId
    total_enrollments: int
    average_progress: float
    average_quiz_score: float
    completion_rate: float
    ai_interactions: int
    last_updated: datetime

    class Config:
        from_attributes = True

class SystemAnalyticsResponse(BaseModel):
    total_users: int
    total_courses: int
    total_quizzes: int
    average_platform_score: float
    user_growth: Dict
    course_activity: Dict
    moderation_stats: Dict
    enrollment_by_department: Dict = {}
    total_enrolled_students: int = 0
    department_colors: Dict = {}
