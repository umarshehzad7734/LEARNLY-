from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional, List, Any
from datetime import datetime, timezone

class Quiz(Document):
    course_id: PydanticObjectId
    title: str
    description: Optional[str] = None
    difficulty: str = "medium"
    is_adaptive: bool = True
    # For adaptive quizzes: store source materials to regenerate per-student
    source_material_ids: Optional[List[PydanticObjectId]] = None
    num_questions: int = 5
    duration_minutes: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "quizzes"
        use_state_management = True

class QuizQuestion(Document):
    quiz_id: PydanticObjectId
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    source_context: Optional[str] = None
    pedagogical_insight: Optional[str] = None
    points: int = 1
    difficulty: str = "medium"

    class Settings:
        name = "quiz_questions"
        use_state_management = True

class QuizAttempt(Document):
    quiz_id: PydanticObjectId
    student_id: PydanticObjectId
    score: float = 0.0
    max_score: float
    percentage: float = 0.0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    time_taken: Optional[int] = None
    
    # Retake permission fields
    can_retake: bool = False
    retake_granted_by: Optional[PydanticObjectId] = None
    retake_granted_at: Optional[datetime] = None

    class Settings:
        name = "quiz_attempts"
        use_state_management = True

class QuizAnswer(Document):
    attempt_id: PydanticObjectId
    question_id: PydanticObjectId
    student_answer: str
    is_correct: bool = False
    points_earned: float = 0.0
    answered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "quiz_answers"
        use_state_management = True
