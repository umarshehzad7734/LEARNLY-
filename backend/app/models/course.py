from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional, List
from datetime import datetime, timezone

class Course(Document):
    title: str
    description: Optional[str] = None
    teacher_id: Optional[PydanticObjectId] = None
    semester: Optional[int] = None
    degree_types: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "courses"
        use_state_management = True

class CourseMaterial(Document):
    course_id: PydanticObjectId
    title: str
    file_path: str
    file_type: str
    vector_store_id: Optional[str] = None
    status: str = "pending"
    index_error: Optional[str] = None
    week: Optional[int] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "course_materials"
        use_state_management = True

class CourseEnrollment(Document):
    course_id: PydanticObjectId
    student_id: PydanticObjectId
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    progress: int = 0
    last_accessed: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "course_enrollments"
        use_state_management = True
