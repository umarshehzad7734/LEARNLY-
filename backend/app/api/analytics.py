from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta, timezone
from typing import List

from app.core.security import get_current_user, get_admin_user, get_teacher_user
from app.models.user import User
from beanie import PydanticObjectId
from app.models.analytics import UserAnalytics, CourseAnalytics
from app.models.course import Course, CourseEnrollment
from app.models.moderation import ModerationLog
from app.models.department import Department
# Note: QuizAttempt is not yet migrated to Beanie in a separate file, assuming needed imports or stubbing for now.
# However, I should check if app.models.quiz is migrated. 
# Looking at task.md, app/models/quiz.py is marked done [x].
from app.models.quiz import QuizAttempt 

from app.schemas.analytics import (
    UserAnalyticsResponse,
    CourseAnalyticsResponse,
    SystemAnalyticsResponse
)

router = APIRouter()

@router.get("/user/{user_id}", response_model=UserAnalyticsResponse)
async def get_user_analytics(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get user analytics"""
    if current_user.id != user_id and current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user's analytics"
        )
    
    analytics = await UserAnalytics.find_one(UserAnalytics.user_id == user_id)
    if not analytics:
        # Create analytics if not exists
        analytics = UserAnalytics(user_id=user_id)
        await analytics.create()
    
    return analytics

@router.get("/course/{course_id}", response_model=CourseAnalyticsResponse)
async def get_course_analytics(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Get course analytics (Teacher/Admin only)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    # Check authorization
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this course's analytics"
        )
    
    analytics = await CourseAnalytics.find_one(CourseAnalytics.course_id == course_id)
    
    if not analytics:
        analytics = CourseAnalytics(course_id=course_id)
        await analytics.create()
    
    return analytics

@router.get("/system", response_model=SystemAnalyticsResponse)
async def get_system_analytics(
    current_user: User = Depends(get_admin_user)
):
    """Get system-wide analytics (Admin only)"""
    # Total counts
    total_users = await User.find_all().count()
    total_courses = await Course.find_all().count()
    total_quizzes = await QuizAttempt.find_all().count()
    
    # Average scores
    # Beanie aggregation
    pipeline = [
        {"$group": {"_id": None, "avg_score": {"$avg": "$percentage"}}}
    ]
    avg_score_result = await QuizAttempt.aggregate(pipeline).to_list()
    avg_score = avg_score_result[0]["avg_score"] if avg_score_result else 0.0
    
    # User growth (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    user_growth = {}
    
    # We can do this efficiently with aggregation
    growth_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    growth_data = await User.aggregate(growth_pipeline).to_list()
    
    # Fill in all days
    for i in range(30):
        date = thirty_days_ago + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        user_growth[date_str] = 0
        
    for entry in growth_data:
        if entry["_id"]:
            user_growth[entry["_id"]] = entry["count"]
            
    # Course activity (enrollments per course)
    course_activity = {}
    # Fetch all courses to get titles
    courses = await Course.find_all().to_list()
    
    for course in courses:
        enrollments = await CourseEnrollment.find(CourseEnrollment.course_id == course.id).count()
        course_activity[course.title] = enrollments
    
    # Moderation stats
    total_moderated = await ModerationLog.find_all().count()
    total_flagged = await ModerationLog.find(ModerationLog.flagged == True).count()
    
    moderation_stats = {
        "total_checked": total_moderated,
        "total_flagged": total_flagged,
        "pass_rate": (total_moderated - total_flagged) / total_moderated if total_moderated > 0 else 1.0
    }
    
    # Students by department: all students grouped by their degree_type
    dept_pipeline = [
        {"$match": {"role": "student"}},
        {"$group": {
            "_id": {"$ifNull": ["$degree_type", "Unspecified"]},
            "count": {"$sum": 1}
        }}
    ]
    dept_data = await User.aggregate(dept_pipeline).to_list()
    
    enrollment_by_department = {}
    total_enrolled_students = 0
    for entry in dept_data:
        dept = entry["_id"] or "Unspecified"
        enrollment_by_department[dept] = entry["count"]
        total_enrolled_students += entry["count"]
    
    # Build department color map from Department collection
    all_departments = await Department.find_all().to_list()
    department_colors = {d.name: d.color for d in all_departments}
    
    return {
        "total_users": total_users,
        "total_courses": total_courses,
        "total_quizzes": total_quizzes,
        "average_platform_score": float(avg_score),
        "user_growth": user_growth,
        "course_activity": course_activity,
        "moderation_stats": moderation_stats,
        "enrollment_by_department": enrollment_by_department,
        "total_enrolled_students": total_enrolled_students,
        "department_colors": department_colors
    }

@router.post("/update/user/{user_id}")
async def update_user_analytics(
    user_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Update user analytics based on current data"""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's analytics"
        )
    
    analytics = await UserAnalytics.find_one(UserAnalytics.user_id == user_id)
    if not analytics:
        analytics = UserAnalytics(user_id=user_id)
        await analytics.create()
    
    # Update quiz stats
    quiz_attempts = await QuizAttempt.find(QuizAttempt.student_id == user_id).to_list()
    
    analytics.total_quizzes_taken = len(quiz_attempts)
    if quiz_attempts:
        analytics.average_score = sum(a.percentage for a in quiz_attempts) / len(quiz_attempts)
        analytics.total_time_spent = sum(a.time_taken or 0 for a in quiz_attempts) // 60
    
    # Update enrollment count
    enrollments = await CourseEnrollment.find(CourseEnrollment.student_id == user_id).count()
    analytics.courses_enrolled = enrollments
    
    # Update engagement score
    engagement = min((analytics.total_quizzes_taken * 10) + (enrollments * 20), 100)
    analytics.engagement_score = engagement
    
    analytics.last_activity = datetime.now(timezone.utc)
    
    await analytics.save()
    
    return {"message": "Analytics updated successfully"}

@router.post("/update/course/{course_id}")
async def update_course_analytics(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Update course analytics (Teacher/Admin only)"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this course's analytics"
        )
    
    analytics = await CourseAnalytics.find_one(CourseAnalytics.course_id == course_id)
    
    if not analytics:
        analytics = CourseAnalytics(course_id=course_id)
        await analytics.create()
    
    # Update enrollments
    enrollments = await CourseEnrollment.find(CourseEnrollment.course_id == course_id).to_list()
    
    analytics.total_enrollments = len(enrollments)
    
    if enrollments:
        analytics.average_progress = sum(e.progress for e in enrollments) / len(enrollments)
        
        completed = sum(1 for e in enrollments if e.progress >= 80)
        analytics.completion_rate = (completed / len(enrollments)) * 100
    
    analytics.last_updated = datetime.now(timezone.utc)
    
    await analytics.save()
    
    return {"message": "Course analytics updated successfully"}
