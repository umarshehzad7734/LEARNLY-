from typing import List, Dict
import json
import re
import random
import difflib
# from app.services.ollama_service import ollama_service (Removed)
from app.services.groq_service import groq_service
from app.services.rag_service import rag_service
from app.core.config import settings

class QuizService:

    def _normalize_mcq_options(self, raw_options, correct_answer: str):
        """
        Normalizes options and mapping correctly to handle A/B/C labels 
        ensuring the full text is preserved.
        """
        if raw_options is None:
            options_list = []
        elif isinstance(raw_options, dict):
            keys = sorted(raw_options.keys(), key=lambda x: str(x).strip().upper())
            options_list = [raw_options[k] for k in keys]
        elif isinstance(raw_options, str):
            parts = re.split(r"\r?\n|\s*;\s*", raw_options)
            options_list = [p for p in parts if p and p.strip()]
        else:
            options_list = list(raw_options)

        def _clean(s: str) -> str:
            s = str(s).strip()
            s = re.sub(r"^['\"]|['\"]$", "", s).strip()
            s = re.sub(r"^[A-Da-d1-4][\.)\-:]\s*", "", s).strip()
            return s

        mapped_correct = None
        clean_correct_input = _clean(correct_answer).upper()
        if len(clean_correct_input) == 1 and clean_correct_input in "ABCD":
            idx = ord(clean_correct_input) - ord('A')
            if idx < len(options_list):
                mapped_correct = _clean(options_list[idx])
        elif len(clean_correct_input) == 1 and clean_correct_input in "1234":
            idx = int(clean_correct_input) - 1
            if idx < len(options_list):
                mapped_correct = _clean(options_list[idx])

        seen = set()
        cleaned = []
        for opt in options_list:
            c = _clean(opt)
            if not c or c.lower() in seen: continue
            seen.add(c.lower())
            cleaned.append(c)

        final_correct = mapped_correct if mapped_correct else _clean(correct_answer)
        
        match_found = False
        for opt in cleaned:
            if opt.lower() == final_correct.lower():
                final_correct = opt
                match_found = True
                break
        
        if not match_found and final_correct:
            cleaned.insert(0, final_correct)

        if len(cleaned) > 4:
            first4 = cleaned[:4]
            if all(opt.lower() != final_correct.lower() for opt in first4):
                first4[-1] = final_correct
            cleaned = first4
        
        fillers = ["None of the above", "All of the above", "Context not available", "True"]
        for f in fillers:
            if len(cleaned) >= 4: break
            if f.lower() not in [o.lower() for o in cleaned]:
                cleaned.append(f)
        
        while len(cleaned) < 4:
            cleaned.append(f"Option {len(cleaned)+1}")

        if not any(o.lower() == final_correct.lower() for o in cleaned):
            final_correct = cleaned[0]

        final_options = cleaned[:4]
        random.shuffle(final_options)
        return final_options, final_correct
    
    async def generate_quiz(
        self,
        course_id: str,
        topic: str = None,
        difficulty: str = "medium",
        num_questions: int = 5,
        material_ids: List[str] = None,
        week: int = None,
        model_provider: str = "groq"
    ) -> Dict:
        """Generate quiz with strict count and multi-material coverage"""
        
        context_query = f"Information about {topic}" if topic else "Main course topics summary"
        
        if material_ids:
            print(f"[QUIZ] Fetching FULL content for {len(material_ids)} materials...")
            # Fetch ALL text from the selected materials to ensure coverage of the "whole" material
            # Pass course_id and material_ids as strings, logic in rag_service handles Beanie conversion
            raw_context = await rag_service.get_materials_text(course_id, material_ids)
            if raw_context:
                context = raw_context
            else:
                context = ""
        else:
            # Fallback to search if no specific materials selected
            relevant_docs = await rag_service.search_vector_store(
                course_id, context_query, top_k=25, material_ids=None
            )
            if relevant_docs:
                random.shuffle(relevant_docs)
            context = "\n\n".join([doc["content"] for doc in relevant_docs]) if relevant_docs else ""
        
        if not context or not context.strip():
            return {"error": "No content found in selected materials."}
        
        # Increase context window but keep it reasonable for speed
        # 20,000 chars is roughly ~4k-5k tokens, good balance of coverage and speed
        context = context[:20000]
        
        difficulty_descriptions = {
            "easy": "EASY: Basic recall and comprehension. Questions should test fundamental definitions, simple facts, and straightforward concepts directly stated in the document.",
            "medium": "MEDIUM: Application and understanding. Questions should require connecting concepts, understanding relationships between ideas, or applying knowledge to scenarios described in the document.",
            "hard": "HARD: Analysis and critical thinking. Questions should require synthesizing information from multiple parts of the document, making inferences, or evaluating complex concepts."
        }
        diff_desc = difficulty_descriptions.get(difficulty, difficulty_descriptions["medium"])
        
        instructions = f"""You are a Quiz Expert and Pedagogical Advisor. 
STRICT RULES:
1. USE ONLY FACTS FROM THE [DOCUMENT].
2. SINGLE CORRECT ANSWER: Each question MUST have exactly ONE indisputably correct answer. The other 3 options MUST be clearly incorrect distractors.
3. CLEAR OPTIONS: Options must be distinct and mutually exclusive. Do not use 'All of the above' or 'None of the above'.
4. NO AMBIGUITY: Avoid questions where multiple answers could be argued as correct.
5. FORMAT: Provide FULL TEXT options. NEVER use labels like 'A.', 'B.', or 'Option 1'.
6. EXACT MATCH: 'correct_answer' MUST be the exact string text matching one of the 'options'.
7. DIVERSITY: Ensure questions cover the ENTIRE document, from start to finish.
8. QUANTITY: You MUST generate EXACTLY the number of questions requested.
9. DIFFICULTY: ALL questions MUST be at "{difficulty}" difficulty level. {diff_desc}

FOR EACH QUESTION, ALSO PROVIDE:
- 'source_context': A direct quote or paraphrase from the document showing WHERE this question's answer comes from (2-3 sentences max).
- 'pedagogical_insight': WHY this question is valuable for learning - what concept/skill it tests and why it matters (1-2 sentences).
- 'explanation': A clear explanation of why the correct answer is right and why the distractors are wrong.

Required Schema: {{ "questions": [ {{ "question_text": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "...", "source_context": "...", "pedagogical_insight": "...", "difficulty": "{difficulty}" }} ] }}"""

        all_valid_questions = []
        max_retries = 3  # Reduced from 8 to prevent timeouts
        
        print(f"[SERVICE] Starting generation loop for {num_questions} questions.")
        
        for attempt in range(max_retries + 1):
            needed = num_questions - len(all_valid_questions)
            if needed <= 0: break
                
            # QUANTITY STRATEGY: 
            # Ask for 1.5x what is needed (reduced from 2x for speed)
            ask_count = max(needed + 1, int(needed * 1.5))
            
            print(f"[QUIZ] Attempt {attempt + 1}: Need {needed}/{num_questions}. Asking for {ask_count}.")
            
            task_desc = f"Generate EXACTLY {ask_count} questions based on the document."
            if attempt > 0:
                task_desc += " CRITICAL: These must be DIFFERENT from any previous questions you generated. Focus on different facts."
            
            # Using specific system prompt for strict JSON adherence which Groq requires
            system_msg = f"{instructions}\n\nIMPORTANT: You must output valid JSON only."
            user_msg = f"[DOCUMENT]\n{context}\n[/DOCUMENT]\n\nTASK: {task_desc}\n\n(Variation Seed: {random.randint(1,10000)})"

            messages = [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ]

            try:
                temp = 0.5 if attempt < 4 else 0.1 # Even higher diversity in early attempts
                
                if model_provider == "groq":
                    if settings.GROQ_API_KEY:
                        print(f"[QUIZ] Using GROQ for generation (Attempt {attempt+1})")
                        response = await groq_service.chat(messages, json_mode=True, temperature=temp)
                    else:
                        raise ValueError("Groq API key not configured")
                else:
                    print(f"[QUIZ WARNING] Only Groq is supported for quiz generation.")
                    response = await groq_service.chat(messages, json_mode=True, temperature=temp)
                
                if not response: continue
                
                # Robust parsing
                resp_text = str(response).strip()
                # Debug logging to catch empty or malformed responses
                if len(resp_text) < 100:
                    print(f"[QUIZ DEBUG] Short response: {resp_text}")
                
                try:
                    data = json.loads(resp_text)
                except:
                    # Try regex if JSON loads fails
                    start_json = re.search(r'[\{\[]', resp_text)
                    if start_json:
                        resp_text = resp_text[start_json.start():]
                        end_json = resp_text.rfind('}') if '{' in resp_text else resp_text.rfind(']')
                        if end_json != -1: resp_text = resp_text[:end_json + 1]
                        data = json.loads(resp_text)
                    else:
                        continue

                batch = data.get("questions", data if isinstance(data, list) else [])
                if not isinstance(batch, list): continue

                added_in_batch = 0
                for q in batch:
                    if not isinstance(q, dict) or not q.get("question_text") or not q.get("correct_answer"):
                        continue
                    
                    q_text = str(q.get("question_text", "")).strip()
                    if len(q_text) < 10 or "placeholder" in q_text.lower():
                        continue

                    opts, correct = self._normalize_mcq_options(q.get("options"), q.get("correct_answer"))
                    
                    # STRICT VALIDATION: Ensure exactly ONE correct answer exists in options
                    correct_matches = [opt for opt in opts if opt.lower() == correct.lower()]
                    
                    # RELAXED VALIDATION: If exact match fails, try fuzzy match
                    if len(correct_matches) != 1:
                        # Fallback: Does any option contain the correct answer substring?
                        matches = [opt for opt in opts if correct.lower() in opt.lower() or opt.lower() in correct.lower()]
                        if len(matches) == 1:
                             # Auto-fix the correct answer to match the option text exactly
                             correct = matches[0]
                             # print(f"[QUIZ FIX] Auto-corrected answer to match option: {correct}")
                        else:
                             # print(f"[QUIZ SKIP] Question has {len(correct_matches)} exact matches and {len(matches)} fuzzy matches, skipping: {q_text[:30]}...")
                             continue
                    
                    # Filter out ambiguous options
                    ambiguous_options = ["all of the above", "none of the above", "both a and b", "a and b"]
                    if any(amb in opt.lower() for opt in opts for amb in ambiguous_options):
                        # print(f"[QUIZ SKIP] Question has ambiguous options, skipping: {q_text[:50]}...")
                        continue
                    
                    # Ensure we don't have exact duplicates
                    if any(q_text.lower() == e["question_text"].lower() for e in all_valid_questions):
                        continue

                    q.update({
                        "question_text": q_text,
                        "options": opts, 
                        "correct_answer": correct, 
                        "question_type": "multiple_choice"
                    })
                    all_valid_questions.append(q)
                    added_in_batch += 1
                    if len(all_valid_questions) >= num_questions: break
                
                print(f"[QUIZ] Attempt {attempt + 1} added {added_in_batch} questions. Current total: {len(all_valid_questions)}")
                
            except Exception as e:
                print(f"[QUIZ WARNING] Attempt fail: {str(e)}")
                import traceback
                traceback.print_exc()

        # STRICT COUNT ENFORCEMENT
        if not all_valid_questions:
            print("[SERVICE ERROR] No questions generated after all retries.")
            return {"error": "Could not generate questions. Please check materials."}

        # Take exactly what we need
        final_list = all_valid_questions[:num_questions]
        
        # If we still don't have enough, we MUST keep trying (max 1 more emergency attempt)
        emergency_attempts = 0
        while len(final_list) < num_questions and emergency_attempts < 1:
            emergency_attempts += 1
            print(f"[QUIZ EMERGENCY] Still need {num_questions - len(final_list)} questions. Emergency attempt {emergency_attempts}...")
            
            needed = num_questions - len(final_list)
            ask_count = needed * 2  # Ask for 2x what we need (reduced from 3x)
            
            task_desc = f"Generate EXACTLY {ask_count} NEW and UNIQUE multiple choice questions. Each must have exactly 4 options with ONE correct answer."
            
            # Fix emergency prompt to use system/user split too to avoid 400 error
            system_msg = f"{instructions}\n\nIMPORTANT: You must output valid JSON only."
            user_msg = f"[DOCUMENT]\n{context}\n[/DOCUMENT]\n\nTASK: {task_desc}\n\n(Emergency Seed: {random.randint(10000,99999)})"
            
            messages = [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ]
            
            try:
                if model_provider == "groq" and settings.GROQ_API_KEY:
                    print(f"[QUIZ EMERGENCY] Using GROQ for emergency generation")
                    response = await groq_service.chat(messages, json_mode=True, temperature=0.7)
                else:
                    raise ValueError("Groq API key required for quiz generation")
                
                if response:
                    resp_text = str(response).strip()
                    try:
                        data = json.loads(resp_text)
                    except:
                        start_json = re.search(r'[\{\[]', resp_text)
                        if start_json:
                            resp_text = resp_text[start_json.start():]
                            end_json = resp_text.rfind('}') if '{' in resp_text else resp_text.rfind(']')
                            if end_json != -1: resp_text = resp_text[:end_json + 1]
                            data = json.loads(resp_text)
                        else:
                            continue
                    
                    batch = data.get("questions", data if isinstance(data, list) else [])
                    for q in batch:
                        if len(final_list) >= num_questions: break
                        if not isinstance(q, dict) or not q.get("question_text") or not q.get("correct_answer"):
                            continue
                        
                        q_text = str(q.get("question_text", "")).strip()
                        if any(q_text.lower() == e["question_text"].lower() for e in final_list):
                            continue
                        
                        opts, correct = self._normalize_mcq_options(q.get("options"), q.get("correct_answer"))
                        correct_matches = [opt for opt in opts if opt.lower() == correct.lower()]
                        if len(correct_matches) != 1:
                            continue
                        
                        q.update({
                            "question_text": q_text,
                            "options": opts,
                            "correct_answer": correct,
                            "question_type": "multiple_choice"
                        })
                        final_list.append(q)
            except Exception as e:
                print(f"[QUIZ EMERGENCY WARNING] Emergency attempt failed: {str(e)}")

        print(f"[QUIZ] SERVICE FINAL RESULT: {len(final_list)} questions (requested: {num_questions}).")
        
        # ABSOLUTE FINAL CHECK - if we still don't have enough, return error instead of padding
        if len(final_list) < num_questions:
            print(f"[QUIZ ERROR] Could only generate {len(final_list)}/{num_questions} valid questions.")
            return {"error": f"Could only generate {len(final_list)} valid questions out of {num_questions} requested. Please try again or select different materials."}
            
        return {"questions": final_list}

    def calculate_adaptive_difficulty(self, student_history: List[Dict]) -> str:
        """Calculate adaptive difficulty based on student performance"""
        if not student_history:
            return "medium"
        
        recent_scores = [attempt["percentage"] for attempt in student_history[-5:]]
        avg_score = sum(recent_scores) / len(recent_scores)
        
        if avg_score >= 80:
            return "hard"
        elif avg_score >= 60:
            return "medium"
        else:
            return "easy"

    def grade_quiz(self, questions: List[Dict], answers: List[Dict]) -> Dict:
        """Grade a quiz attempt"""
        print(f"\n[QUIZ GRADING] Starting grading process")
        total_points = 0
        earned_points = 0
        results = []
        
        answer_lookup = {ans["question_id"]: ans["student_answer"] for ans in answers}
        
        for question in questions:
            total_points += question.get("points", 1)
            student_answer = answer_lookup.get(question["id"], "")
            correct_answer = question["correct_answer"]
            
            is_correct = self._check_answer(
                student_answer,
                correct_answer,
                question["question_type"]
            )
            
            points_earned = question.get("points", 1) if is_correct else 0
            earned_points += points_earned
            
            results.append({
                "question_id": question["id"],
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "points_earned": points_earned,
                "explanation": question.get("explanation", "")
            })
        
        percentage = int(round(earned_points / total_points * 100)) if total_points > 0 else 0
        
        return {
            "total_points": total_points,
            "earned_points": earned_points,
            "percentage": percentage,
            "passed": percentage >= 50,
            "results": results
        }

    def _check_answer(self, student_answer: str, correct_answer: str, question_type: str) -> bool:
        """Check if student answer is correct with improved normalization"""
        student_answer = str(student_answer) if student_answer is not None else ""
        correct_answer = str(correct_answer) if correct_answer is not None else ""
        
        student_answer = ' '.join(student_answer.strip().lower().split())
        correct_answer = ' '.join(correct_answer.strip().lower().split())
        
        import re
        prefix_pattern = r'^[a-z0-9][\.\)\- ]\s+'
        student_answer_no_prefix = re.sub(prefix_pattern, '', student_answer)
        correct_answer_no_prefix = re.sub(prefix_pattern, '', correct_answer)
        
        if question_type == "multiple_choice":
            return (student_answer == correct_answer or 
                    student_answer_no_prefix == correct_answer_no_prefix or
                    student_answer_no_prefix == correct_answer or
                    student_answer == correct_answer_no_prefix)
        else:
            return student_answer == correct_answer or student_answer_no_prefix == correct_answer_no_prefix

quiz_service = QuizService()
