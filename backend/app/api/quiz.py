from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timezone

from app.core.security import get_current_user, get_teacher_user
from app.models.user import User, UserRole
from beanie import PydanticObjectId
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizAnswer
from app.models.course import Course, CourseMaterial, CourseEnrollment
from app.models.notification import Notification
from app.schemas.quiz import (
    QuizCreate, QuizResponse, QuizAttemptCreate, QuizAttemptResponse,
    GenerateQuizRequest, GrantRetakeRequest
)
# from app.services.quiz_service import quiz_service # Assuming service needs update or we inline logic

# Stubbing quiz_service if it relies on SQL or complex logic not yet migrated
# Ideally we should migrate the service too, but for API layer we can handle DB interactions here.
# Or we mock the generation part.
# Let's import it but handle DB errors if it tries to use SQL session.
# Actually, the user wants "work like postgres", so AI generation must work.
# I will assume quiz_service.generate_quiz returns a dict and doesn't touch DB directly except for reading materials?
# If it reads materials via SQL, it will break.
# I'll need to check quiz_service later. For now, I'll rewrite API to be async Beanie.

from app.services.quiz_service import quiz_service
from app.services.rag_service import rag_service
from app.services.groq_service import groq_service

router = APIRouter()

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(
    request: GenerateQuizRequest,
    current_user: User = Depends(get_teacher_user)
):
    """Generate AI-powered quiz and save to database (Teacher/Admin only)
    
    If is_adaptive is True, generates 3 sets of questions (easy, medium, hard)
    so each student gets questions matching their competency tier.
    """
    # Check course access
    course = await Course.get(PydanticObjectId(request.course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    material_ids = []
    if request.material_ids:
        material_ids = [PydanticObjectId(mid) for mid in request.material_ids]
        
    # Week logic
    if request.week and not material_ids:
        week_materials = await CourseMaterial.find(
            CourseMaterial.course_id == course.id,
            CourseMaterial.week == request.week,
            CourseMaterial.status == "completed"
        ).to_list()
        material_ids = [m.id for m in week_materials]
        
        if not material_ids:
            raise HTTPException(status_code=400, detail=f"No materials for Week {request.week}")

    # Validate materials
    if material_ids:
        materials = await CourseMaterial.find(
            CourseMaterial.id == {"$in": material_ids},
            CourseMaterial.course_id == course.id
        ).to_list()
        
        if len(materials) != len(material_ids):
            raise HTTPException(status_code=400, detail="Invalid material IDs")
    
    adaptive_label = " (Adaptive)" if request.is_adaptive else ""
    if request.title:
        quiz_title = request.title
    elif request.topic:
        quiz_title = f"{request.topic} - Quiz{adaptive_label}"
    else:
        quiz_title = f"{course.title} - Quiz{adaptive_label}"
    
    quiz = Quiz(
        course_id=course.id,
        title=quiz_title,
        description=f"AI-generated quiz with {request.num_questions} questions per tier. Adaptive: {'Yes' if request.is_adaptive else 'No'}",
        difficulty=request.difficulty,
        is_adaptive=request.is_adaptive,
        source_material_ids=material_ids if material_ids else None,
        num_questions=request.num_questions,
        duration_minutes=request.duration_minutes
    )
    await quiz.create()
    
    all_questions = []
    
    if request.is_adaptive:
        # ===== ADAPTIVE: Single AI call for all 3 tiers =====
        import json as _json
        import random as _random
        
        # Fetch material context once
        if material_ids:
            raw_context = await rag_service.get_materials_text(
                str(course.id), [str(m) for m in material_ids]
            )
            context = raw_context if raw_context else ""
        else:
            relevant_docs = await rag_service.search_vector_store(
                str(course.id), request.topic or "Main course topics", top_k=25
            )
            context = "\n\n".join([doc["content"] for doc in relevant_docs]) if relevant_docs else ""
        
        if not context or not context.strip():
            await quiz.delete()
            raise HTTPException(status_code=400, detail="No content found in selected materials.")
        
        context = context[:15000]  # Keep context shorter to leave room for output
        n = request.num_questions  # questions per tier
        ask_per_tier = n + 2  # Ask for extra as buffer
        total_ask = ask_per_tier * 3
        
        adaptive_prompt = f"""You are a Quiz Expert. Generate EXACTLY {total_ask} multiple-choice questions from the document below.

You MUST generate {ask_per_tier} EASY, {ask_per_tier} MEDIUM, and {ask_per_tier} HARD questions.

Generate them in ORDER: all EASY first, then all MEDIUM, then all HARD.

EASY = basic recall, definitions, simple facts from the document.
MEDIUM = applying concepts, understanding relationships between ideas.
HARD = analysis, synthesis, critical thinking, making inferences.

RULES:
1. USE ONLY FACTS FROM THE DOCUMENT.
2. Each question: exactly 4 options, ONE correct answer.
3. 'correct_answer' MUST be the EXACT same string as one of the 'options'.
4. Full text options only. No 'A.', 'B.', 'Option 1' labels.
5. No 'All of the above' or 'None of the above'.
6. Include a brief 'explanation' for each.
7. Set 'difficulty' to exactly "easy", "medium", or "hard".

JSON ONLY:
{{"questions": [{{"question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "...", "difficulty": "easy"}}]}}"""

        user_msg = f"[DOCUMENT]\n{context}\n[/DOCUMENT]\n\nGenerate {total_ask} questions: {ask_per_tier} easy + {ask_per_tier} medium + {ask_per_tier} hard. (ID:{_random.randint(1,99999)})"
        
        messages = [
            {"role": "system", "content": adaptive_prompt},
            {"role": "user", "content": user_msg}
        ]
        
        print(f"[QUIZ GEN] Single AI call for {total_ask} questions ({ask_per_tier} per tier, need {n} per tier)...")
        
        try:
            response = await groq_service.chat(messages, json_mode=True, temperature=0.5)
        except Exception as e:
            print(f"[QUIZ GEN] AI call failed: {str(e)}")
            await quiz.delete()
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
        
        if not response:
            await quiz.delete()
            raise HTTPException(status_code=500, detail="Empty response from AI")
        
        # Parse the response
        try:
            data = _json.loads(str(response).strip())
        except _json.JSONDecodeError:
            import re as _re
            resp_text = str(response).strip()
            start = _re.search(r'[\{\[]', resp_text)
            if start:
                resp_text = resp_text[start.start():]
                end = resp_text.rfind('}')
                if end != -1:
                    resp_text = resp_text[:end + 1]
                try:
                    data = _json.loads(resp_text)
                except:
                    await quiz.delete()
                    raise HTTPException(status_code=500, detail="Failed to parse AI response")
            else:
                await quiz.delete()
                raise HTTPException(status_code=500, detail="Failed to parse AI response")
        
        raw_questions = data.get("questions", data if isinstance(data, list) else [])
        print(f"[QUIZ GEN] AI returned {len(raw_questions)} raw questions")
        
        # Step 1: Validate and bucket by difficulty
        buckets = {"easy": [], "medium": [], "hard": []}
        for q_data in raw_questions:
            if not isinstance(q_data, dict):
                continue
            if not q_data.get("question_text") or not q_data.get("correct_answer"):
                continue
            
            opts, correct = quiz_service._normalize_mcq_options(
                q_data.get("options"), q_data.get("correct_answer")
            )
            
            q_diff = str(q_data.get("difficulty", "medium")).lower().strip()
            if q_diff not in ("easy", "medium", "hard"):
                q_diff = "medium"
            
            buckets[q_diff].append({
                "question_text": str(q_data.get("question_text", "")).strip(),
                "options": opts,
                "correct_answer": correct,
                "explanation": q_data.get("explanation", ""),
            })
        
        print(f"[QUIZ GEN] Bucketed - Easy: {len(buckets['easy'])}, Medium: {len(buckets['medium'])}, Hard: {len(buckets['hard'])}")
        
        # Step 2: Enforce exactly N per tier
        # First trim any tier with more than N
        for tier in ["easy", "medium", "hard"]:
            if len(buckets[tier]) > n:
                buckets[tier] = buckets[tier][:n]
        
        # Then fill any tier with fewer than N from tiers that still have surplus
        for tier in ["easy", "medium", "hard"]:
            while len(buckets[tier]) < n:
                # Find a donor tier that has more than N
                donated = False
                for donor in ["easy", "medium", "hard"]:
                    if donor == tier:
                        continue
                    if len(buckets[donor]) > n:
                        buckets[tier].append(buckets[donor].pop())
                        donated = True
                        break
                if not donated:
                    # No surplus anywhere — find any tier with at least 1 extra
                    for donor in ["easy", "medium", "hard"]:
                        if donor == tier:
                            continue
                        if len(buckets[donor]) > 0 and len(buckets[donor]) > len(buckets[tier]):
                            buckets[tier].append(buckets[donor].pop())
                            donated = True
                            break
                if not donated:
                    break  # Can't fill further
        
        print(f"[QUIZ GEN] Balanced - Easy: {len(buckets['easy'])}, Medium: {len(buckets['medium'])}, Hard: {len(buckets['hard'])}")
        
        # Step 3: Save to DB
        for diff in ["easy", "medium", "hard"]:
            for q_data in buckets[diff]:
                question = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=q_data["question_text"],
                    question_type="multiple_choice",
                    options=q_data["options"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    points=1,
                    difficulty=diff
                )
                await question.create()
                all_questions.append(question)
        
        print(f"[QUIZ GEN] ✓ Total saved: {len(all_questions)} questions ({n} per tier target)")
        
    else:
        # ===== NON-ADAPTIVE: Single difficulty via quiz_service =====
        quiz_data = await quiz_service.generate_quiz(
            course_id=str(course.id),
            topic=request.topic,
            difficulty=request.difficulty,
            num_questions=request.num_questions,
            material_ids=[str(m) for m in material_ids],
            week=request.week,
            model_provider=request.model_provider
        )
        
        if "error" in quiz_data:
            await quiz.delete()
            raise HTTPException(status_code=500, detail=quiz_data["error"])
        
        for q_data in quiz_data.get("questions", []):
            question = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q_data.get("question_text", ""),
                question_type=q_data.get("question_type", "multiple_choice"),
                options=q_data.get("options", []),
                correct_answer=q_data.get("correct_answer", ""),
                explanation=q_data.get("explanation", ""),
                points=q_data.get("points", 1),
                difficulty=request.difficulty
            )
            await question.create()
            all_questions.append(question)
    
    if not all_questions:
        # Clean up the quiz if no questions were generated
        await quiz.delete()
        raise HTTPException(status_code=500, detail="Failed to generate questions")
    
    # Trigger Notifications
    try:
        enrollments = await CourseEnrollment.find(CourseEnrollment.course_id == course.id).to_list()
        for enr in enrollments:
            notification = Notification(
                user_id=enr.student_id,
                title="New Quiz Available",
                message=f"A new quiz '{quiz.title}' has been generated. You can attempt it now.",
                link=f"/student/course/{course.id}"
            )
            await notification.create()
    except Exception as e:
        print(f"[QUIZ NOTIFICATION ERROR] failed to create notifications: {e}")
        
    # Build response
    response_quiz = quiz.model_dump()
    response_quiz["id"] = str(quiz.id)
    response_quiz["course_id"] = str(quiz.course_id)
    response_quiz["questions"] = []
    for q in all_questions:
        q_dict = q.model_dump()
        q_dict["id"] = str(q.id)
        q_dict["quiz_id"] = str(q.quiz_id)
        response_quiz["questions"].append(q_dict)
    return response_quiz

@router.post("/", response_model=QuizResponse)
async def create_quiz(
    quiz_data: QuizCreate,
    current_user: User = Depends(get_teacher_user)
):
    """Create a quiz (Teacher/Admin only)"""
    course = await Course.get(PydanticObjectId(quiz_data.course_id))
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    quiz = Quiz(
        course_id=course.id,
        title=quiz_data.title,
        description=quiz_data.description,
        difficulty=quiz_data.difficulty,
        is_adaptive=quiz_data.is_adaptive,
        duration_minutes=quiz_data.duration_minutes
    )
    await quiz.create()
    
    questions_list = []
    for q_data in quiz_data.questions:
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q_data.question_text,
            question_type=q_data.question_type,
            options=q_data.options,
            correct_answer=q_data.correct_answer,
            explanation=q_data.explanation,
            points=q_data.points,
            difficulty=q_data.difficulty
        )
        await question.create()
        questions_list.append(question)
        
    # Trigger Notifications
    try:
        enrollments = await CourseEnrollment.find(CourseEnrollment.course_id == course.id).to_list()
        for enr in enrollments:
            notification = Notification(
                user_id=enr.student_id,
                title="New Quiz Available",
                message=f"A new quiz '{quiz.title}' has been added. You can attempt it now.",
                link=f"/student/course/{course.id}"
            )
            await notification.create()
    except Exception as e:
        print(f"[QUIZ NOTIFICATION ERROR] failed to create notifications: {e}")

    response_quiz = quiz.model_dump()
    response_quiz["id"] = str(quiz.id)
    response_quiz["course_id"] = str(quiz.course_id)
    response_quiz["questions"] = []
    for q in questions_list:
        q_dict = q.model_dump()
        q_dict["id"] = str(q.id)
        q_dict["quiz_id"] = str(q.quiz_id)
        response_quiz["questions"].append(q_dict)
    return response_quiz

@router.get("/course/{course_id}/attempts", response_model=List[dict])
async def get_course_quiz_attempts(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Get all student quiz attempts"""
    course = await Course.get(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Complex join query not easy in Mongo.
    # Logic: Get all quizzes for course -> Get all attempts for those quizzes.
    quizzes = await Quiz.find(Quiz.course_id == course_id).to_list()
    quiz_ids = [q.id for q in quizzes]
    
    attempts = await QuizAttempt.find(QuizAttempt.quiz_id == {"$in": quiz_ids}).sort("-completed_at").to_list()
    
    # Construct response
    result = []
    for att in attempts:
        # Fetch derived data
        # student_name, quiz_title
        student = await User.get(att.student_id)
        quiz = next((q for q in quizzes if q.id == att.quiz_id), None)
        
        data = att.dict()
        data["id"] = str(att.id)
        data["quiz_id"] = str(att.quiz_id)
        data["student_id"] = str(att.student_id)
        data["student_name"] = student.full_name if student else "Unknown"
        data["quiz_title"] = quiz.title if quiz else "Unknown"
        result.append(data)
        
    return result

@router.get("/course/{course_id}", response_model=List[QuizResponse])
async def get_course_quizzes(
    course_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get all quizzes for a course"""
    quizzes = await Quiz.find(Quiz.course_id == course_id).to_list()
    
    # Populate questions for each? Expensive. Maybe just list?
    # Schema likely expects questions list.
    response_quizzes = []
    for q in quizzes:
        questions = await QuizQuestion.find(QuizQuestion.quiz_id == q.id).to_list()
        q_dict = q.model_dump()
        q_dict["id"] = str(q.id)
        q_dict["course_id"] = str(q.course_id)
        q_dict["questions"] = []
        for ques in questions:
            ques_dict = ques.model_dump()
            ques_dict["id"] = str(ques.id)
            ques_dict["quiz_id"] = str(ques.quiz_id)
            q_dict["questions"].append(ques_dict)
        response_quizzes.append(q_dict)
        
    return response_quizzes

@router.get("/answer-key/{quiz_id}")
async def get_quiz_answer_key(
    quiz_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get quiz with correct answers (all difficulty tiers for adaptive quizzes)"""
    quiz = await Quiz.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    questions = await QuizQuestion.find(QuizQuestion.quiz_id == quiz_id).to_list()
    
    result = quiz.dict()
    result["id"] = str(quiz.id)
    result["course_id"] = str(quiz.course_id)
    
    # Group questions by difficulty for adaptive quizzes
    if quiz.is_adaptive:
        grouped = {"easy": [], "medium": [], "hard": []}
        for q in questions:
            q_dict = q.dict()
            q_dict["id"] = str(q.id)
            q_dict["quiz_id"] = str(q.quiz_id)
            tier = q.difficulty if q.difficulty in grouped else "medium"
            grouped[tier].append(q_dict)
        result["questions_by_tier"] = grouped
        # Also include flat list for backward compat
        result["questions"] = []
        for tier_questions in grouped.values():
            result["questions"].extend(tier_questions)
    else:
        result["questions"] = []
        for q in questions:
            q_dict = q.dict()
            q_dict["id"] = str(q.id)
            q_dict["quiz_id"] = str(q.quiz_id)
            result["questions"].append(q_dict)
    
    return result

@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: PydanticObjectId,
    current_user: User = Depends(get_current_user)
):
    """Get quiz by ID
    
    For students accessing an adaptive quiz:
    - Questions are filtered from pre-generated tiers based on competency
    - Competency < 60 → Easy questions
    - Competency 60-79 → Medium questions  
    - Competency >= 80 → Hard questions
    
    Teachers see all questions from all tiers.
    """
    quiz = await Quiz.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Get all questions for this quiz
    all_questions = await QuizQuestion.find(QuizQuestion.quiz_id == quiz_id).to_list()
    
    # For students taking an adaptive quiz, filter to their competency tier
    if quiz.is_adaptive and current_user.role == "student":
        student_competency = current_user.competency_score or 50
        
        if student_competency >= 80:
            student_difficulty = "hard"
        elif student_competency >= 60:
            student_difficulty = "medium"
        else:
            student_difficulty = "easy"
        
        print(f"[ADAPTIVE QUIZ] Student {current_user.id} competency: {student_competency}% -> Showing {student_difficulty} questions")
        
        # Filter questions to the student's difficulty tier
        tier_questions = [q for q in all_questions if q.difficulty == student_difficulty]
        
        # Fallback: if no questions for this tier, use medium, then any available
        if not tier_questions:
            tier_questions = [q for q in all_questions if q.difficulty == "medium"]
        if not tier_questions:
            tier_questions = all_questions
        
        response_quiz = quiz.dict()
        response_quiz["id"] = str(quiz.id)
        response_quiz["course_id"] = str(quiz.course_id)
        response_quiz["difficulty"] = student_difficulty
        response_quiz["questions"] = [
            {**q.dict(), "id": str(q.id), "quiz_id": str(q.quiz_id)}
            for q in tier_questions
        ]
        return response_quiz
    
    # Teacher or non-adaptive: return all questions
    response_quiz = quiz.dict()
    response_quiz["id"] = str(quiz.id)
    response_quiz["course_id"] = str(quiz.course_id)
    response_quiz["questions"] = [
        {**q.dict(), "id": str(q.id), "quiz_id": str(q.quiz_id)}
        for q in all_questions
    ]
    return response_quiz

@router.delete("/{quiz_id}")
async def delete_quiz(
    quiz_id: PydanticObjectId,
    current_user: User = Depends(get_teacher_user)
):
    """Delete a quiz"""
    quiz = await Quiz.get(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    course = await Course.get(quiz.course_id)
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Delete questions?
    await QuizQuestion.find(QuizQuestion.quiz_id == quiz_id).delete()
    await quiz.delete()
    
    return {"message": "Quiz deleted"}

@router.post("/attempt/{attempt_id}/grant-retake")
async def grant_retake_permission(
    attempt_id: PydanticObjectId,
    request: GrantRetakeRequest, # unused?
    current_user: User = Depends(get_teacher_user)
):
    """Grant retake"""
    attempt = await QuizAttempt.get(attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    
    quiz = await Quiz.get(attempt.quiz_id)
    course = await Course.get(quiz.course_id)
    
    if current_user.role == "teacher" and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attempt.can_retake = True
    attempt.retake_granted_by = current_user.id
    attempt.retake_granted_at = datetime.now(timezone.utc)
    
    await attempt.save()
    
    return {"message": "Retake granted"}

@router.post("/attempt")
async def submit_quiz_attempt(
    attempt_data: QuizAttemptCreate,
    current_user: User = Depends(get_current_user)
):
    """Submit quiz attempt — always grades against DB-stored questions"""
    quiz = await Quiz.get(PydanticObjectId(attempt_data.quiz_id))
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Check existing attempt
    existing = await QuizAttempt.find_one(
        QuizAttempt.quiz_id == quiz.id,
        QuizAttempt.student_id == current_user.id,
        QuizAttempt.completed_at != None
    )
    
    if existing:
        if not existing.can_retake:
            raise HTTPException(status_code=400, detail="Already completed")
        else:
            existing.can_retake = False
            await existing.save()
    
    # Fetch questions from DB — for adaptive quizzes, filter to student's tier
    all_db_questions = await QuizQuestion.find(QuizQuestion.quiz_id == quiz.id).to_list()
    
    if quiz.is_adaptive and current_user.role == "student":
        student_competency = current_user.competency_score or 50
        if student_competency >= 80:
            student_difficulty = "hard"
        elif student_competency >= 60:
            student_difficulty = "medium"
        else:
            student_difficulty = "easy"
        
        db_questions = [q for q in all_db_questions if q.difficulty == student_difficulty]
        # Fallback
        if not db_questions:
            db_questions = [q for q in all_db_questions if q.difficulty == "medium"]
        if not db_questions:
            db_questions = all_db_questions
        
        print(f"[GRADING] Adaptive quiz — student {current_user.id} tier: {student_difficulty}, {len(db_questions)} questions")
    else:
        db_questions = all_db_questions
    
    if not db_questions:
        raise HTTPException(status_code=400, detail="No questions found for this quiz")
    
    questions_for_grading = [
        {
            "id": str(q.id),
            "correct_answer": q.correct_answer,
            "points": q.points,
            "question_type": q.question_type,
            "explanation": q.explanation or ""
        }
        for q in db_questions
    ]
    max_score = sum(q.points for q in db_questions)
    
    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_id=current_user.id,
        max_score=max_score,
        started_at=datetime.now(timezone.utc)
    )
    await attempt.create()
    
    # Grade
    grade_result = quiz_service.grade_quiz(
        questions=questions_for_grading,
        answers=[{
            "question_id": a.question_id,
            "student_answer": a.student_answer
        } for a in attempt_data.answers]
    )
    
    # Save answers and build response
    resp_answers = []
    for ans_data in attempt_data.answers:
        q = next((q for q in questions_for_grading if q["id"] == ans_data.question_id), None)
        if q:
            student_ans = ans_data.student_answer.strip().lower() if ans_data.student_answer else ""
            correct_ans = q["correct_answer"].strip().lower() if q["correct_answer"] else ""
            is_correct = student_ans == correct_ans
            points = q["points"] if is_correct else 0
            
            # All questions are now real DB records, so save QuizAnswer for all
            try:
                answer = QuizAnswer(
                    attempt_id=attempt.id,
                    question_id=PydanticObjectId(ans_data.question_id),
                    student_answer=ans_data.student_answer,
                    is_correct=is_correct,
                    points_earned=points
                )
                await answer.create()
            except Exception as e:
                print(f"[GRADING] Failed to save answer: {e}")
            
            resp_answers.append({
                "question_id": ans_data.question_id,
                "student_answer": ans_data.student_answer,
                "correct_answer": q["correct_answer"],
                "is_correct": is_correct,
                "points_earned": points,
                "explanation": q.get("explanation", "")
            })
    
    attempt.score = grade_result["earned_points"]
    attempt.percentage = grade_result["percentage"]
    attempt.completed_at = datetime.now(timezone.utc)
    attempt.time_taken = 0
    
    await attempt.save()
    
    # Update competency
    if current_user.role == "student":
        old_competency = current_user.competency_score
        
        recent_attempts = await QuizAttempt.find(
            QuizAttempt.student_id == current_user.id,
            QuizAttempt.completed_at != None
        ).sort("-completed_at").limit(5).to_list()
        
        if recent_attempts:
            total_weight = 0
            weighted_sum = 0
            for idx, att in enumerate(recent_attempts):
                weight = 1.0 / (idx + 1)
                weighted_sum += att.percentage * weight
                total_weight += weight
            
            avg_performance = weighted_sum / total_weight if total_weight > 0 else 50
            new_competency = int(0.6 * float(old_competency) + 0.4 * avg_performance)
            current_user.competency_score = max(0, min(100, new_competency))
            await current_user.save()
    
    return {
        "id": str(attempt.id),
        "quiz_id": str(attempt.quiz_id),
        "student_id": str(attempt.student_id),
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percentage": attempt.percentage,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
        "time_taken": attempt.time_taken,
        "can_retake": attempt.can_retake,
        "passed": attempt.percentage >= 50 if attempt.percentage is not None else False,
        "answers": resp_answers
    }

@router.get("/attempts/my", response_model=List[QuizAttemptResponse])
async def get_my_quiz_attempts(
    current_user: User = Depends(get_current_user)
):
    attempts = await QuizAttempt.find(QuizAttempt.student_id == current_user.id).sort("-completed_at").to_list()
    result = []
    for att in attempts:
        att_dict = att.model_dump()
        att_dict["id"] = str(att.id)
        att_dict["quiz_id"] = str(att.quiz_id)
        att_dict["student_id"] = str(att.student_id)
        result.append(att_dict)
    return result

