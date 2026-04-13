from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from beanie import PydanticObjectId
from app.schemas.base import PyObjectId

class CourseMaterialResponse(BaseModel):
    id: PyObjectId # Use PyObjectId to match DB model
    title: str
    file_type: str
    file_path: str
    uploaded_at: datetime
    week: Optional[int] = None
    vector_store_id: Optional[str] = None
    status: Optional[str] = "pending"
    index_error: Optional[str] = None

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    teacher_id: Optional[str] = None
    semester: Optional[int] = None
    degree_types: Optional[str] = None

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    teacher_id: Optional[str] = None
    semester: Optional[int] = None
    degree_types: Optional[str] = None
    is_active: Optional[bool] = None

class CourseResponse(CourseBase):
    id: PyObjectId
    teacher_id: Optional[PyObjectId]
    teacher_name: Optional[str] = None
    semester: Optional[int] = None
    degree_types: Optional[str] = None
    is_active: bool
    created_at: datetime
    materials: List[CourseMaterialResponse] = []
    enrollment_count: int = 0

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    student_id: str
    course_id: str

class EnrollmentResponse(BaseModel):
    id: PyObjectId
    course_id: PyObjectId
    student_id: PyObjectId
    full_name: Optional[str] = None
    email: Optional[str] = None
    enrolled_at: datetime
    progress: int
    student: Optional["UserResponse"] = None

    class Config:
        from_attributes = True


    class Config:
        from_attributes = True

# Add this import at top if needed, or rely on forward ref if possible. 
# Best practice: use explicit type if available or 'UserResponse' string forward ref.
from app.schemas.user import UserResponse
EnrollmentResponse.update_forward_refs()
