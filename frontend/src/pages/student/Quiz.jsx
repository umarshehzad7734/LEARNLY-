import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ClipboardList, Trophy, CheckCircle2, BookOpen, TrendingUp, BarChart3, Clock, AlertTriangle } from 'lucide-react'
import Layout from '../../components/Layout'
import { quizAPI, authAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'

const LayoutIcon = TrendingUp

const StudentQuiz = () => {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()

  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [isTimeUp, setIsTimeUp] = useState(false)

  const sidebarItems = [
    { label: 'Dashboard', path: '/student', icon: LayoutIcon },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  // Timer Effect
  useEffect(() => {
    if (timeLeft === null || submitted) return;

    if (timeLeft <= 0) {
      if (!isTimeUp) {
        setIsTimeUp(true);
        handleSubmit();
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, submitted, isTimeUp]);

  // Tab Close Warning Effect
  useEffect(() => {
    if (submitted || !quiz || timeLeft === null) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Standard requirement to show prompt
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted, quiz, timeLeft]);

  const fetchQuiz = async () => {
    try {
      const response = await quizAPI.getById(quizId)
      const quizData = response.data
      setQuiz(quizData)
      if (quizData.duration_minutes) {
        setTimeLeft(quizData.duration_minutes * 60)
      }

      const attemptsRes = await quizAPI.getMyAttempts()
      const existingAttempt = (attemptsRes.data || []).find(
        attempt => attempt.quiz_id === quizId
      )

      if (existingAttempt) {
        alert('You have already completed this quiz. Redirecting to results...')
        navigate(`/student/course/${quizData.course_id}?tab=results`)
      }
    } catch (error) {
      console.error('Failed to fetch quiz details:', error)
      alert('Error loading quiz. It might have been deleted.')
      navigate(-1)
    }
  }

  const handleSubmit = async () => {
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        student_answer: answer
      }))

      const response = await quizAPI.submitAttempt({
        quiz_id: quizId,
        answers: formattedAnswers
      })

      setResult(response.data)
      setSubmitted(true)

      try {
        const userResponse = await authAPI.getMe()
        updateUser(userResponse.data)
      } catch (err) {
        console.error('Failed to refresh user data:', err)
      }

      setTimeout(() => {
        navigate(`/student/course/${quiz.course_id}?tab=results`)
      }, 3000)
    } catch (error) {
      console.error('Failed to submit quiz:', error)
      const detail = error.response?.data?.detail
      const errorMsg = typeof detail === 'string' ? detail : (detail ? JSON.stringify(detail) : error.message)
      alert('Failed to submit quiz: ' + errorMsg)
    }
  }

  if (!quiz) return (
    <Layout sidebarItems={sidebarItems} title="Quiz">
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    </Layout>
  )

  return (
    <Layout sidebarItems={sidebarItems} title={quiz.title}>
      <div className="max-w-3xl mx-auto pb-20">
        {!submitted ? (
          <div>
            {/* Timer Sticky UI */}
            {quiz?.duration_minutes && timeLeft !== null && (
              <div className={`sticky top-4 z-40 mb-6 flex items-center justify-between p-4 rounded-xl border-2 shadow-sm transition-all ${
                timeLeft < 60 
                  ? 'bg-red-50 border-red-200 text-red-700 animate-[pulse_2s_ease-in-out_infinite]' 
                  : 'bg-white border-[#14BF96]/20 text-slate-700'
              }`}>
                <div className="flex items-center gap-3">
                  {timeLeft < 60 ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-[#14BF96]" />}
                  <span className="font-bold uppercase tracking-widest text-[10px]">Time Remaining</span>
                </div>
                <div className={`text-2xl font-black tabular-nums tracking-tight ${timeLeft < 60 ? 'text-red-600' : 'text-slate-800'}`}>
                  {Math.max(0, Math.floor(timeLeft / 60)).toString().padStart(2, '0')}:{Math.max(0, timeLeft % 60).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {/* Quiz Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-8 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{quiz.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {quiz.questions.length} Questions
                    </span>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                      In Progress
                    </span>
                  </div>
                </div>
              </div>
              {quiz.description && (
                <p className="text-sm text-slate-500 leading-relaxed">{quiz.description}</p>
              )}
            </div>

            {/* Questions */}
            <div className="space-y-5">
              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 hover:border-green-200 transition-colors"
                >
                  <div className="flex gap-4">
                    <span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 mb-5 leading-relaxed">
                        {question.question_text}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {question.options?.map((option, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${answers[question.id] === option
                                ? 'border-green-500 bg-green-50'
                                : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${answers[question.id] === option
                                ? 'border-green-500 bg-green-500'
                                : 'border-slate-300 bg-white'
                              }`}>
                              {answers[question.id] === option && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option}
                              onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                              className="hidden"
                            />
                            <span className={`text-sm font-medium ${answers[question.id] === option ? 'text-green-800' : 'text-slate-600'
                              }`}>
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit Bar */}
            <div className="mt-8 flex items-center justify-between bg-white border border-slate-200 rounded-xl p-5">
              <div>
                <p className="text-xs text-slate-400 font-medium">Progress</p>
                <p className="text-sm font-semibold text-slate-700">{Object.keys(answers).length} of {quiz.questions.length} completed</p>
              </div>
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={Object.keys(answers).length !== quiz.questions.length}
              >
                Submit Quiz
              </button>
            </div>
          </div>
        ) : (
          /* Results Screen */
          <div className="text-center py-20 bg-white border border-slate-200 rounded-xl">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Quiz Submitted!</h3>
            <p className="text-sm text-slate-400 mb-8">Your answers have been recorded.</p>

            {result && (
              <div className="space-y-6">
                <div className="inline-block bg-slate-50 rounded-2xl px-10 py-6 border border-slate-100">
                  {result.percentage >= 50 ? (
                    <span className="inline-block px-3 py-1 mb-3 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Passed</span>
                  ) : (
                    <span className="inline-block px-3 py-1 mb-3 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Failed</span>
                  )}
                  <div className="text-5xl font-bold text-green-600 mb-1">{Math.round(result.percentage)}%</div>
                  <p className="text-xs text-slate-400">Overall Score</p>
                </div>

                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800">{result.score}</p>
                    <p className="text-xs text-slate-400 mt-1">Correct</p>
                  </div>
                  <div className="w-px h-8 bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-800">{result.max_score}</p>
                    <p className="text-xs text-slate-400 mt-1">Total</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-slate-400">Redirecting to course results...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default StudentQuiz
