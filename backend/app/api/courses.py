from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional
import os
from pathlib import Path
import shutil
from datetime import datetime, timezone

from app.core.security import get_current_user, get_admin_user, get_teacher_user
from app.core.config import settings
from app.models.user import User, UserRole
from beanie import PydanticObjectId
from app.models.course import Course, CourseMaterial, CourseEnrollment
from app.models.analytics import CourseAnalytics
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    EnrollmentCreate,
    EnrollmentResponse
)
from app.services.rag_service import rag_service

router = APIRouter()

async def process_material_indexing(course_id: PydanticObjectId, material_id: PydanticObjectId, file_path: str, title: str):
    """Background task to index material and update status"""
    try:
        print(f"[BACKGROUND] Starting indexing for material {material_id}: {title}")
        
        # Update status to processing
        material = await CourseMaterial.get(material_id)
        if material:
            material.status = "processing"
            await material.save()

        # Perform indexing (stubbed for now)
        vector_store_id = await rag_service.create_vector_store(
            course_id=str(course_id),
            file_path=file_path,
            material_title=title
        )

        # Update material record on success
        # material = await CourseMaterial.get(material_id) # Refresh
        if material:
            material.vector_store_id = vector_store_id
            material.status = "completed"
            material.index_error = None
            await material.save()
            print(f"[BACKGROUND] [SUCCESS] Indexing completed for material {material_id}")
            
    except Exception as e:
        print(f"[BACKGROUND ERROR] Indexing failed for material {material_id}: {str(e)}")
        # Update status on failure
        # material = await CourseMaterial.get(material_id) # Refresh
        if material:
            material.status = "failed"
            material.index_error = str(e)
            await material.save()

@router.post("/", response_model=CourseResponse)
async def create_course(
    course_data: CourseCreate,
    current_user: User = Depends(get_admin_user)
):
    """Create a new course (Admin only)"""
    # Validate teacher if provided
    if course_data.teacher_id:
        # Beanie get
        teacher = await User.find_one(User.id == PydanticObjectId(course_data.teacher_id), User.role == UserRole.teacher)
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid teacher ID"
            )
    
    course = Course(
        title=course_data.title,
        description=course_data.description,
        teacher_id=PydanticObjectId(course_data.teacher_id) if course_data.teacher_id else None,
        semester=course_data.semester,
        degree_types=course_data.degree_types,
        is_active=True
    )
    
    await course.create()
    
    # Create analytics
    analytics = CourseAnalytics(course_id=course.id)
    await analytics.create()
    
    # Manual serialization
    resp = course.model_dump()
    resp["id"] = str(course.id)
    if course.teacher_id:
        resp["teacher_id"] = str(course.teacher_id)
    return resp

@router.get("/", response_model=List[CourseResponse])
async def get_courses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
):
    """Get all courses"""
    if current_user.role == "admin":
        courses = await Course.find_all().skip(skip).limit(limit).to_list()
    elif current_user.role == "teacher":
        # DEBUG: Show ALL courses to verify data existence (Bypass ownership check)
        courses = await Course.find_all().skip(skip).limit(limit).to_list()
        # Original: courses = await Course.find(Course.teacher_id == current_user.id).skip(skip).limit(limit).to_list()
    else:  # student
        enrollments = await CourseEnrollment.find(CourseEnrollment.student_id == current_user.id).to_list()
        course_ids = [e.course_id for e in enrollments]
        if course_ids:
            courses = await Course.find(Course.id == {"$in": course_ids}).to_list()
        else:
            courses = []
    
    # Populate teacher names and materials
    response_courses = []
    for course in courses:
        course_dict = course.model_dump()
        course_dict["id"] = str(course.id)
        if course.teacher_id:
            course_dict["teacher_id"] = str(course.teacher_id)
            teacher = await User.get(course.teacher_id)
            if teacher:
                course_dict["teacher_name"] = teacher.full_name
        
        # Populate materials (simple fetch)
        materials = await CourseMaterial.find(CourseMaterial.course_id == course.id).to_list()
        course_dict["materials"] = []
        for mat in materials:
            mat_dict = mat.model_dump()
            mat_dict["id"] = str(mat.id)
            mat_dict["course_id"] = str(mat.course_id)
            course_dict["materials"].append(mat_dict)
        
        # Add enrollment count
        enrollment_count = await CourseEnrollment.find(CourseEnrollment.course_id == course.id).count()
        course_dict["enrollment_count"] = enrollment_count
        
        response_courses.append(course_dict)
                
    return response_courses

@router.get("/available/for-student", response_model=List[CourseResponse])
async def get_available_courses(
    current_user: User = Depends(get_current_user)
):
    """Get courses available for the current student based on their semester and degree"""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this endpoint"
        )
    
    student_semester = current_user.semester
    student_degree = current_user.degree_type
    
    query = Course.find(Course.is_active == True)
    courses = await query.to_list()
    
    filtered_courses = []
    if not student_semester or not student_degree:
        filtered_courses = courses
    else:
        for course in courses:
            if course.semester and course.semester != student_semester:
                continue
            
            if course.degree_types:
                degree_list = [d.strip() for d in course.degree_types.split(',')]
                if student_degree not in degree_list:
                    continue
            
            filtered_courses.append(course)
            
    # Populate teacher names
    response_courses = []
    for course in filtered_courses:
        course_dict = course.model_dump()
        course_dict["id"] = str(course.id)
        if course.teacher_id:
            course_dict["teacher_id"] = str(course.teacher_id)
            teacher = await User.get(course.teacher_id)
            if teacher:
                course_dict["teacher_name"] = teacher.full_name
        
        # Populate materials
        materials = await CourseMaterial.find(CourseMaterial.course_id == course.id).to_list()
        course_dict["materials"] = []
        for mat in materials:
            mat_dict = mat.model_dump()
            mat_dict["id"] = str(mat.id)
            mat_dict["course_id"] = str(mat.course_id)
            course_dict["materials"].append(mat_dict)

        response_courses.append(course_dict)
                
    return response_courses

@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get a specific course with full details (Teacher/Student authorized)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # DEBUG
    print(f"[DEBUG] get_course: User={current_user.email}, Role={current_user.role}, CourseID={course_id}")
    
    # Check access
    if current_user.role == "student":
        enrollment = await CourseEnrollment.find_one(
            CourseEnrollment.course_id == course_id,
            CourseEnrollment.student_id == current_user.id
        )
        print(f"[DEBUG] Enrollment check: Found={enrollment is not None}")
        if not enrollment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enrolled in this course"
            )
    elif current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this course"
        )
    
    course_dict = course.model_dump()
    course_dict["id"] = str(course.id)
    if course.teacher_id:
        course_dict["teacher_id"] = str(course.teacher_id)
        teacher = await User.get(course.teacher_id)
        if teacher:
            course_dict["teacher_name"] = teacher.full_name
    
    # Fetch materials
    materials = await CourseMaterial.find(CourseMaterial.course_id == course.id).to_list()
    course_dict["materials"] = []
    for mat in materials:
        mat_dict = mat.model_dump()
        mat_dict["id"] = str(mat.id)
        mat_dict["course_id"] = str(mat.course_id)
        course_dict["materials"].append(mat_dict)
            
    return course_dict

@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: PydanticObjectId,
    course_data: CourseUpdate,
    current_user: User = Depends(get_admin_user)
):
    """Update course (Admin only)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = course_data.dict(exclude_unset=True)
    
    # Handle teacher_id conversion if present
    if "teacher_id" in update_data and update_data["teacher_id"]:
         update_data["teacher_id"] = PydanticObjectId(update_data["teacher_id"])
         
    # Handle degree_types - already string from schema
    # if "degree_types" in update_data and update_data["degree_types"]:
    #     pass # Pydantic already validated it as str

    await course.update({"$set": update_data})
    
    # Refresh to return updated
    course = await Course.get(course_id)
    
    course_dict = course.model_dump()
    course_dict["id"] = course.id
    if course.teacher_id:
        teacher = await User.get(course.teacher_id)
        if teacher:
            course_dict["teacher_name"] = teacher.full_name
            
    return course_dict

@router.delete("/{course_id}")
async def delete_course(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_admin_user)
):
    """Delete course (Admin only)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    await course.delete()
    return {"message": "Course deleted successfully"}

@router.post("/{course_id}/materials")
async def upload_course_material(
    course_id: PydanticObjectId,
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    week: Optional[int] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_teacher_user)
):
    """Upload course material (Teacher/Admin only)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Validate file type
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not allowed"
        )
    
    # Save file
    uploads_dir = Path("uploads") / f"course_{course_id}"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = uploads_dir / f"{title.replace(' ', '_')}{file_ext}"
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Create material record
    material = CourseMaterial(
        course_id=course_id,
        title=title,
        week=week,
        file_path=str(file_path),
        file_type=file_ext[1:],
        status="pending"
    )
    await material.create()
    
    # Background task
    background_tasks.add_task(
        process_material_indexing,
        course_id=course_id,
        material_id=material.id,
        file_path=str(file_path),
        title=title
    )
    
    return {
        "material_id": str(material.id),
        "status": "pending",
        "message": "Material uploaded successfully"
    }

@router.delete("/{course_id}/materials/{material_id}")
async def delete_course_material(
    course_id: PydanticObjectId,
    material_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Delete course material"""
    # Logic similar to SQL but async
    # ...
    material = await CourseMaterial.get(material_id)
    if not material or material.course_id != course_id:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check course ownership
    course = await Course.get(course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await material.delete()
    return {"message": "Material deleted"}

@router.post("/{course_id}/materials/{material_id}/reindex")
async def reindex_course_material(
    course_id: PydanticObjectId,
    material_id: PydanticObjectId,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_teacher_user)
):
    """Re-index a course material"""
    material = await CourseMaterial.get(material_id)
    if not material or material.course_id != course_id:
        raise HTTPException(status_code=404, detail="Material not found")
    
    # Check course ownership
    course = await Course.get(course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Reset status
    material.status = "processing"
    material.index_error = None
    await material.save()
    
    # Trigger background indexing
    # We need the file path and title from the material record
    if not material.file_path or not os.path.exists(material.file_path):
         raise HTTPException(status_code=400, detail="Original file not found on server")

    background_tasks.add_task(
        process_material_indexing,
        course_id=course_id,
        material_id=material.id,
        file_path=material.file_path,
        title=material.title
    )
    
    return {"message": "Re-indexing started"}

@router.post("/enroll", response_model=EnrollmentResponse)
async def enroll_in_course(
    enrollment_data: EnrollmentCreate,
    current_user: User = Depends(get_current_user)
):
    """Enroll student in course"""
    course_id_obj = PydanticObjectId(enrollment_data.course_id)
    student_id_obj = PydanticObjectId(enrollment_data.student_id)

    if current_user.role != "admin" and student_id_obj != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # DEBUG
    print(f"[DEBUG] Enroll: Current User ID={current_user.id}, Role={current_user.role}")
    print(f"[DEBUG] Enroll: Course ID={course_id_obj}, Student ID={student_id_obj}")
    
    course = await Course.get(course_id_obj)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    existing = await CourseEnrollment.find_one(
        CourseEnrollment.course_id == course_id_obj,
        CourseEnrollment.student_id == student_id_obj
    )
    print(f"[DEBUG] Enroll: Existing enrollment found: {bool(existing)}")
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
        
    enrollment = CourseEnrollment(
        course_id=course_id_obj,
        student_id=student_id_obj
    )
    await enrollment.create()
    
    # Update analytics
    analytics = await CourseAnalytics.find_one(CourseAnalytics.course_id == course_id_obj)
    if analytics:
        analytics.total_enrollments += 1
        await analytics.save()
        
    # Manual serialization
    resp = enrollment.model_dump()
    resp["id"] = str(enrollment.id)
    resp["course_id"] = str(enrollment.course_id)
    resp["student_id"] = str(enrollment.student_id)
    return resp

@router.get("/{course_id}/students", response_model=List[EnrollmentResponse])
async def get_course_students(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Get all students enrolled in a course"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    enrollments = await CourseEnrollment.find(CourseEnrollment.course_id == course_id).to_list()
    
    # Populate student details manually
    response_enrollments = []
    for enrollment in enrollments:
        enrollment_dict = enrollment.model_dump()
        enrollment_dict["id"] = enrollment.id
        
        student = await User.get(enrollment.student_id)
        if student:
            enrollment_dict["student"] = student
            enrollment_dict["full_name"] = student.full_name
            enrollment_dict["email"] = student.email
            
        response_enrollments.append(enrollment_dict)
            
    return response_enrollments

@router.get("/available/for-enrollment", response_model=List[CourseResponse])
async def get_available_courses_enrollment(
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student only")
        
    enrolled = await CourseEnrollment.find(CourseEnrollment.student_id == current_user.id).to_list()
    enrolled_ids = [e.course_id for e in enrolled]
    
    available = await Course.find(
        Course.id != {"$in": enrolled_ids}  # Syntax might need check: {"$nin": ...} usually
    ).to_list() 
    # Beanie operator: NotIn? or just standard Mongo query.
    # Course.find({"_id": {"$nin": enrolled_ids}})
    
    available = await Course.find({"_id": {"$nin": enrolled_ids}}).to_list()
    
    return available
