from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Import models
from app.models.user import User
from app.models.course import Course, CourseMaterial, CourseEnrollment
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.models.analytics import UserAnalytics, CourseAnalytics
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.moderation import ModerationLog, ModerationSettings
from app.models.chat_history import ChatSession, ChatHistory
from app.models.department import Department
from app.models.notification import Notification

async def init_db():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(database=client[settings.DATABASE_NAME], document_models=[
        User,
        Course, CourseMaterial, CourseEnrollment,
        Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
        UserAnalytics, CourseAnalytics,
        Assignment, AssignmentSubmission,
        ModerationLog, ModerationSettings,
        ChatSession, ChatHistory,
        Department,
        Notification
    ])
