from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse
from app.schemas.quiz import QuizCreate, QuizResponse, QuizAttemptCreate
from app.schemas.analytics import UserAnalyticsResponse, CourseAnalyticsResponse

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "QuizCreate",
    "QuizResponse",
    "QuizAttemptCreate",
    "UserAnalyticsResponse",
    "CourseAnalyticsResponse",
]
