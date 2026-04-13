from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict
from beanie import PydanticObjectId
from app.core.security import get_current_user
from app.models.user import User
from app.models.quiz import QuizAttempt
from app.models.assignment import AssignmentSubmission
from app.models.analytics import CourseAnalytics

router = APIRouter()

@router.get("/student/course/{course_id}")
async def get_student_course_analytics(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
) -> Dict:
    """Get per-course performance analytics for student"""
    
    # Get quiz attempts for this course
    quiz_attempts = await QuizAttempt.find(
        QuizAttempt.student_id == current_user.id
    ).to_list()
    
    # Filter to only this course's quizzes
    from app.models.quiz import Quiz
    course_quizzes = await Quiz.find(Quiz.course_id == course_id).to_list()
    course_quiz_ids = {q.id for q in course_quizzes}
    
    course_attempts = [a for a in quiz_attempts if a.quiz_id in course_quiz_ids]
    
    # Get assignment submissions for this course
    assignments = await AssignmentSubmission.find(
        AssignmentSubmission.student_id == current_user.id
    ).to_list()
    
    from app.models.assignment import Assignment
    course_assignments_objs = await Assignment.find(Assignment.course_id == course_id).to_list()
    course_assignment_ids = {a.id for a in course_assignments_objs}
    
    course_submissions = [s for s in assignments if s.assignment_id in course_assignment_ids]
    
    # Calculate quiz performance
    quiz_avg = 0
    if course_attempts:
        quiz_avg = sum(a.percentage for a in course_attempts) / len(course_attempts)
    
    # Calculate assignment completion rate
    assignment_completion_rate = 0
    if course_assignments_objs:
        completed = len([s for s in course_submissions if s.status == "graded"])
        assignment_completion_rate = (completed / len(course_assignments_objs)) * 100
    
    # Get AI interactions from course analytics
    course_analytics = await CourseAnalytics.find_one(CourseAnalytics.course_id == course_id)
    ai_interactions = course_analytics.ai_interactions if course_analytics else 0
    
    # Calculate overall grade (weighted average)
    overall_grade = (quiz_avg * 0.7) + (assignment_completion_rate * 0.3) if quiz_avg or assignment_completion_rate else 0
    
    return {
        "course_id": str(course_id),
        "quiz_average": round(quiz_avg, 1),
        "quiz_count": len(course_attempts),
        "assignment_completion_rate": round(assignment_completion_rate, 1),
        "assignment_count": len(course_assignments_objs),
        "submitted_count": len(course_submissions),
        "ai_interactions": ai_interactions,
        "overall_grade": round(overall_grade, 1)
    }
