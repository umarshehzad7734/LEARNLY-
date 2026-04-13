from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional
from datetime import datetime, timezone

class Assignment(Document):
    course_id: PydanticObjectId
    title: str
    description: Optional[str] = None
    assignment_type: str = "assignment"  # assignment, project, lab
    max_score: float = 100.0
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    allow_late_submission: bool = False
    attachment_path: Optional[str] = None

    class Settings:
        name = "assignments"
        use_state_management = True

class AssignmentSubmission(Document):
    assignment_id: PydanticObjectId
    student_id: PydanticObjectId
    submission_text: Optional[str] = None
    file_path: Optional[str] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    score: Optional[float] = None
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    is_late: bool = False

    class Settings:
        name = "assignment_submissions"
        use_state_management = True
