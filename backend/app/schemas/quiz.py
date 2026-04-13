from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Dict
from datetime import datetime
from beanie import PydanticObjectId
from app.schemas.base import PyObjectId

class QuizQuestionBase(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: Optional[str] = None
    source_context: Optional[str] = None  # Where in the material this came from
    pedagogical_insight: Optional[str] = None  # Why this question matters
    points: int = 1
    difficulty: str = "medium"

class QuizQuestionCreate(QuizQuestionBase):
    pass

class QuizQuestionResponse(BaseModel):
    id: PyObjectId
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[List[str]] = []
    points: int = 1
    difficulty: str = "medium"

    class Config:
        from_attributes = True

class QuizQuestionTeacherResponse(BaseModel):
    id: PyObjectId
    question_text: str
    question_type: str = "multiple_choice"
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = ""
    explanation: Optional[str] = ""
    source_context: Optional[str] = ""
    pedagogical_insight: Optional[str] = ""
    points: int = 1
    difficulty: str = "medium"

    class Config:
        from_attributes = True

class QuizBase(BaseModel):
    title: str = "Untitled Quiz"
    description: Optional[str] = None
    difficulty: str = "medium"
    is_adaptive: bool = True
    num_questions: int = 5
    duration_minutes: Optional[int] = None

class QuizCreate(QuizBase):
    course_id: str
    questions: List[QuizQuestionCreate]

class QuizResponse(QuizBase):
    id: PyObjectId
    course_id: PyObjectId
    created_at: datetime
    questions: List[QuizQuestionResponse] = []

    class Config:
        from_attributes = True

class QuizTeacherResponse(QuizBase):
    id: PyObjectId
    course_id: PyObjectId
    created_at: datetime
    questions: List[QuizQuestionTeacherResponse] = []

    class Config:
        from_attributes = True

class QuizAnswerSubmit(BaseModel):
    question_id: str
    student_answer: str

class QuizAttemptCreate(BaseModel):
    quiz_id: str
    answers: List[QuizAnswerSubmit]

class QuizAttemptResponse(BaseModel):
    id: PyObjectId
    quiz_id: PyObjectId
    student_id: PyObjectId
    score: float
    max_score: float
    percentage: int
    completed_at: Optional[datetime]
    time_taken: Optional[int]
    can_retake: bool = False
    retake_granted_at: Optional[datetime] = None

    @field_validator('percentage', mode='before')
    @classmethod
    def round_percentage(cls, v):
        if isinstance(v, (float, int)):
            return int(round(v))
        return v

    passed: bool = False

    @model_validator(mode='after')
    def compute_passed(self):
        if self.percentage is not None:
            self.passed = self.percentage >= 50
        return self

    class Config:
        from_attributes = True

class QuizAnswerResponse(BaseModel):
    question_id: PyObjectId
    student_answer: str
    correct_answer: str
    is_correct: bool
    points_earned: float
    explanation: Optional[str]

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def extract_question_details(cls, v):
        # Handle ORM object with nested question relationship
        if not isinstance(v, dict) and hasattr(v, 'question') and v.question:
            return {
                'question_id': str(v.question_id),
                'student_answer': v.student_answer,
                'is_correct': v.is_correct,
                'points_earned': v.points_earned,
                'correct_answer': v.question.correct_answer,
                'explanation': v.question.explanation
            }
        return v

class QuizAttemptDetailResponse(QuizAttemptResponse):
    answers: List[QuizAnswerResponse] = []

class GenerateQuizRequest(BaseModel):
    course_id: str
    title: Optional[str] = None  # Custom quiz title provided by teacher
    topic: Optional[str] = None
    difficulty: str = "medium"
    num_questions: int = 5
    week: Optional[int] = None
    duration_minutes: Optional[int] = None
    material_ids: List[str] = []  # Specific materials to generate quiz from
    model_provider: Optional[str] = "groq"  # 'groq' or 'ollama'
    is_adaptive: bool = True  # If true, difficulty will be calculated per-student based on their competency

class GrantRetakeRequest(BaseModel):
    reason: Optional[str] = None
