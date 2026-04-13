from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path

from app.core.security import get_current_user, get_teacher_user
from app.core.config import settings
from app.models.user import User, UserRole
from beanie import PydanticObjectId
from app.models.course import Course, CourseEnrollment
from app.models.assignment import Assignment, AssignmentSubmission
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentResponse,
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionResponse
)

router = APIRouter()

@router.post("/", response_model=AssignmentResponse)
async def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(get_teacher_user)
):
    """Create a new assignment (Teacher/Admin only)"""
    # Verify course exists
    course = await Course.get(PydanticObjectId(assignment_data.course_id))
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to create assignments for this course"
        )
    
    assignment = Assignment(
        course_id=PydanticObjectId(assignment_data.course_id),
        title=assignment_data.title,
        description=assignment_data.description,
        assignment_type=assignment_data.assignment_type,
        max_score=assignment_data.max_score,
        due_date=assignment_data.due_date,
        allow_late_submission=assignment_data.allow_late_submission
    )
    
    await assignment.create()
    
    # Manual serialization for response
    resp = assignment.model_dump()
    resp["id"] = str(assignment.id)
    resp["course_id"] = str(assignment.course_id)
    return resp

@router.get("/course/{course_id}", response_model=List[AssignmentResponse])
async def get_course_assignments(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    # DEBUG
    print(f"[DEBUG] get_course_assignments: CourseID={course_id}")
    
    course = await Course.get(course_id)
    if not course:
        print(f"[DEBUG] Course {course_id} not found in DB")
        raise HTTPException(status_code=404, detail="Course not found")
    
    assignments = await Assignment.find(
        Assignment.course_id == course_id,
        Assignment.is_active == True
    ).to_list()
    
    print(f"[DEBUG] Found {len(assignments)} assignments for course {course_id}")
    
    result = []
    for assignment in assignments:
        count = await AssignmentSubmission.find(AssignmentSubmission.assignment_id == assignment.id).count()
        
        assignment_dict = assignment.model_dump()
        assignment_dict["id"] = str(assignment.id)
        assignment_dict["course_id"] = str(assignment.course_id)
        assignment_dict["submission_count"] = count
        result.append(assignment_dict)
    
    return result

@router.post("/{assignment_id}/upload-attachment")
async def upload_assignment_attachment(
    assignment_id: PydanticObjectId,
    file: UploadFile = File(...),
    current_user: User = Depends(get_teacher_user)
):
    """Upload assignment attachment (Teacher only)"""
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await Course.get(assignment.course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Save file
    uploads_dir = Path("uploads") / f"assignments" / f"assignment_{assignment_id}"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = uploads_dir / file.filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    assignment.attachment_path = str(file_path)
    await assignment.save()
    
    return {"message": "Attachment uploaded successfully", "file_path": str(file_path)}

@router.post("/submit")
async def submit_assignment(
    assignment_id: PydanticObjectId = Form(...),
    submission_text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    """Submit an assignment (Student)"""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit assignments")
    
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Check if student is enrolled
    enrollment = await CourseEnrollment.find_one(
        CourseEnrollment.course_id == assignment.course_id,
        CourseEnrollment.student_id == current_user.id
    )
    if not enrollment:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    
    # Check for existing submission
    existing = await AssignmentSubmission.find_one(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == current_user.id
    )
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already submitted")
    
    # Check if late
    is_late = False
    if assignment.due_date and datetime.now() > assignment.due_date.replace(tzinfo=None): # naive comparison if due_date is naive
        if not assignment.allow_late_submission:
            raise HTTPException(status_code=400, detail="Deadline passed")
        is_late = True
    
    # Save file
    file_path_str = None
    if file:
        uploads_dir = Path("uploads") / f"submissions" / f"assignment_{assignment_id}"
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        real_path = uploads_dir / f"student_{current_user.id}_{file.filename}"
        with open(real_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        file_path_str = str(real_path)
    
    submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        submission_text=submission_text,
        file_path=file_path_str,
        is_late=is_late
    )
    
    await submission.create()
    
    return {"message": "Assignment submitted successfully", "submission_id": str(submission.id)}

@router.get("/{assignment_id}/submissions", response_model=List[SubmissionResponse])
async def get_assignment_submissions(
    assignment_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Get all submissions for an assignment (Teacher only)"""
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await Course.get(assignment.course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    submissions = await AssignmentSubmission.find(
        AssignmentSubmission.assignment_id == assignment_id
    ).to_list()
    
    # Populate result with student names using a dictionary approach to avoid Pydantic field errors
    
    result = []
    for sub in submissions:
        student = await User.get(sub.student_id)
        sub_dict = sub.model_dump()
        sub_dict["id"] = str(sub.id)
        sub_dict["assignment_id"] = str(sub.assignment_id)
        sub_dict["student_id"] = str(sub.student_id)
        if student:
            sub_dict["student_name"] = student.full_name
            sub_dict["student_email"] = student.email
        result.append(sub_dict)
        
    return result

@router.patch("/submission/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    submission_id: PydanticObjectId,
    grade_data: SubmissionUpdate,
    current_user: User = Depends(get_teacher_user)
):
    """Grade a submission (Teacher only)"""
    submission = await AssignmentSubmission.get(submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    assignment = await Assignment.get(submission.assignment_id)
    course = await Course.get(assignment.course_id)
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {}
    if grade_data.score is not None:
        update_dict["score"] = grade_data.score
    if grade_data.feedback is not None:
        update_dict["feedback"] = grade_data.feedback
        
    update_dict["graded_at"] = datetime.now()
    
    await submission.update({"$set": update_dict})
    
    # Fetch updated submission and add student name
    updated_submission = await AssignmentSubmission.get(submission_id)
    student = await User.get(updated_submission.student_id)
    
    # Return updated submission with student name and email
    result = updated_submission.model_dump()
    result["id"] = str(updated_submission.id)
    result["assignment_id"] = str(updated_submission.assignment_id)
    result["student_id"] = str(updated_submission.student_id)
    if student:
        result["student_name"] = student.full_name
        result["student_email"] = student.email
    
    return result

@router.get("/my-submissions", response_model=List[SubmissionResponse])
async def get_my_submissions(
    current_user: User = Depends(get_current_user)
):
    """Get all submissions for the current student"""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student only")
    
    submissions = await AssignmentSubmission.find(
        AssignmentSubmission.student_id == current_user.id
    ).to_list()
    
    result = []
    for sub in submissions:
        sub_dict = sub.model_dump()
        sub_dict["id"] = str(sub.id)
        sub_dict["assignment_id"] = str(sub.assignment_id)
        sub_dict["student_id"] = str(sub.student_id)
        sub_dict["student_name"] = current_user.full_name
        result.append(sub_dict)
        
    return result

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Delete an assignment and all its submissions (Teacher/Admin only)"""
    assignment = await Assignment.get(assignment_id)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    course = await Course.get(assignment.course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete all submissions first
    await AssignmentSubmission.find(AssignmentSubmission.assignment_id == assignment_id).delete()
    
    # Delete the assignment
    await assignment.delete()
    
    return {"message": "Assignment and all submissions deleted successfully"}
