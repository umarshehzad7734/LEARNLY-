import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  BookOpen, FileText, Trophy, MessageCircle, Download,
  ArrowLeft, Clock, CheckCircle, Award, Target, Upload, Calendar, Users, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react'
import Layout from '../../components/Layout'
import { coursesAPI, quizAPI, assignmentAPI } from '../../utils/api'

const StudentCourseDetail = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [course, setCourse] = useState(null)
  const [materials, setMaterials] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [attempts, setAttempts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [mySubmissions, setMySubmissions] = useState([])
  const [activeTab, setActiveTab] = useState('materials')
  const [loading, setLoading] = useState(true)
  const [submissionFile, setSubmissionFile] = useState(null)
  const [submissionText, setSubmissionText] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const sidebarItems = [
    { label: 'Dashboard', path: '/student', icon: TrendingUp },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: TrendingUp },
  ]

  useEffect(() => {
    fetchCourseData()
    const tabParam = searchParams.get('tab')
    if (tabParam) setActiveTab(tabParam)
  }, [courseId, searchParams])

  const fetchCourseData = async () => {
    setLoading(true)
    try {
      const [courseRes, quizzesRes, attemptsRes, assignmentsRes, submissionsRes] = await Promise.all([
        coursesAPI.getById(courseId),
        quizAPI.getByCourse(courseId),
        quizAPI.getMyAttempts(),
        assignmentAPI.getByCourse(courseId),
        assignmentAPI.getMySubmissions()
      ])

      setCourse(courseRes.data)
      setMaterials(courseRes.data.materials || [])
      setQuizzes(quizzesRes.data || [])
      setAssignments(assignmentsRes.data || [])
      setMySubmissions(submissionsRes.data || [])

      const attemptsData = attemptsRes.data || []
      const quizzesData = quizzesRes.data || []
      const courseAttempts = attemptsData.filter(
        attempt => quizzesData.some(quiz => quiz.id === attempt.quiz_id)
      )
      setAttempts(courseAttempts)
    } catch (error) {
      console.error('Failed to fetch course data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAttemptForQuiz = (quizId) => {
    return attempts.filter(a => a.quiz_id === quizId)
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
  }

  const calculateAverageScore = () => {
    if (attempts.length === 0) return 0
    const sum = attempts.reduce((acc, att) => acc + att.percentage, 0)
    return (sum / attempts.length).toFixed(1)
  }

  const handleAssignmentSubmit = async (assignmentId) => {
    try {
      const formData = new FormData()
      formData.append('assignment_id', assignmentId)
      if (submissionText) formData.append('submission_text', submissionText)
      if (submissionFile) formData.append('file', submissionFile)

      await assignmentAPI.submit(formData)
      alert('Assignment submitted successfully!')
      setSubmissionFile(null)
      setSubmissionText('')
      fetchCourseData()
    } catch (error) {
      alert('Failed to submit assignment: ' + (error.response?.data?.detail || error.message))
    }
  }

  const getSubmissionForAssignment = (assignmentId) => {
    return mySubmissions.find(sub => sub.assignment_id === assignmentId)
  }

  const isAssignmentOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  // Pagination
  const getPaginatedItems = (items) => {
    const start = (currentPage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }
  const getTotalPages = (items) => Math.ceil(items.length / itemsPerPage)

  if (loading) {
    return (
      <Layout sidebarItems={sidebarItems} title="Course Details">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    )
  }

  if (!course) {
    return (
      <Layout sidebarItems={sidebarItems} title="Course Not Found">
        <div className="text-center py-12">
          <p className="text-slate-500">Course not found</p>
          <button onClick={() => navigate('/student/courses')} className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
            Back to Courses
          </button>
        </div>
      </Layout>
    )
  }

  const tabs = [
    { id: 'materials', label: 'Materials', icon: FileText },
    { id: 'assignments', label: 'Assignments', icon: FileText },
    { id: 'quizzes', label: 'Quizzes', icon: Trophy },
    { id: 'results', label: 'My Progress', icon: Award },
  ]

  const renderPagination = (totalItems) => {
    const totalPages = getTotalPages(totalItems)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
            >
              {page}
            </button>
          ))}
          {totalPages > 5 && (
            <>
              <span className="text-slate-400 px-1">...</span>
              {[totalPages - 1, totalPages].map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {page}
                </button>
              ))}
            </>
          )}
        </div>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Students Overview">
      <div className="max-w-[1100px] mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">My Courses</h1>
          <p className="text-sm text-slate-400">View course materials, quizzes, and track your progress.</p>
        </div>

        {/* Course Section Header */}
        <h2 className="text-base font-bold text-slate-900 mb-4">My Course</h2>

        {/* Course Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="px-3 py-1 bg-green-100 text-green-700 text-[11px] font-semibold rounded-md">
              {course.course_code || 'Course'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">{course.title}</h2>
          <p className="text-sm text-slate-500 mb-4">{course.description || 'No description available'}</p>

          {/* Stats Row */}
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{assignments.length} Assignments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>{materials.length} Resources</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>{quizzes.length} Quiz</span>
            </div>
          </div>
        </div>

        {/* AI Tutor Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/student/ai-chat/${courseId}`)}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Launch AI Tutor
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1) }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id
                ? 'text-green-600'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t"></div>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div>
              <div className="divide-y divide-slate-100">
                {materials.length > 0 ? (
                  getPaginatedItems(materials).map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between py-4 px-2 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                          <FileText className="w-4.5 h-4.5 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{material.title}</span>
                      </div>
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${material.file_path}`}
                        download
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No materials available yet</p>
                  </div>
                )}
              </div>
              {renderPagination(materials)}
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 'assignments' && (
            <div className="divide-y divide-slate-100">
              {assignments.length > 0 ? (
                getPaginatedItems(assignments).map((assignment) => {
                  const submission = getSubmissionForAssignment(assignment.id)
                  const isOverdue = isAssignmentOverdue(assignment.due_date)

                  return (
                    <div key={assignment.id} className="py-4 px-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                            <FileText className="w-4.5 h-4.5 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{assignment.title}</h3>
                              {submission && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-semibold rounded">
                                  Submitted
                                </span>
                              )}
                              {!submission && isOverdue && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-semibold rounded">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                Max: {assignment.max_score}
                              </span>
                            </div>
                          </div>
                        </div>
                        {submission ? (
                          <div className="text-right">
                            {submission.score !== null ? (
                              <span className={`text-sm font-bold ${submission.score >= (assignment.max_score * 0.5) ? 'text-green-600' : 'text-red-500'}`}>
                                {submission.score}/{assignment.max_score}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Pending Review</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id={`file-${assignment.id}`}
                              onChange={(e) => setSubmissionFile(e.target.files[0])}
                              className="hidden"
                            />
                            <label
                              htmlFor={`file-${assignment.id}`}
                              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5 inline mr-1" /> Choose File
                            </label>
                            <button
                              onClick={() => handleAssignmentSubmit(assignment.id)}
                              disabled={!submissionFile}
                              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-16 text-center">
                  <Upload className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No assignments available yet</p>
                </div>
              )}
              {renderPagination(assignments)}
            </div>
          )}

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
            <div className="divide-y divide-slate-100">
              {quizzes.length > 0 ? (
                getPaginatedItems(quizzes).map((quiz) => {
                  const quizAttempts = getAttemptForQuiz(quiz.id)
                  const bestScore = quizAttempts.length > 0
                    ? Math.max(...quizAttempts.map(a => a.percentage))
                    : null

                  return (
                    <div key={quiz.id} className="flex items-center justify-between py-4 px-2 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100">
                          <Trophy className="w-4.5 h-4.5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{quiz.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                            <span>{quiz.is_adaptive ? (quiz.num_questions || Math.floor((quiz.questions?.length || 0) / 3)) : (quiz.questions?.length || 0)} questions</span>
                            <span className="capitalize">{quiz.difficulty}</span>
                            {bestScore !== null && (
                              <span className="text-green-600 font-medium">Best: {Math.round(bestScore)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {quizAttempts.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Completed
                          </span>
                          <button
                            onClick={() => setActiveTab('results')}
                            className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            View Results
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/student/quiz/${quiz.id}`)}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Take Quiz
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="py-16 text-center">
                  <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No quizzes available yet</p>
                </div>
              )}
              {renderPagination(quizzes)}
            </div>
          )}

          {/* Results Tab (My Progress) */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              {attempts.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900">{attempts.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Completed</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{calculateAverageScore()}%</p>
                    <p className="text-xs text-slate-400 mt-1">Average Score</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{attempts.filter(a => a.percentage >= 50).length}/{attempts.length}</p>
                    <p className="text-xs text-slate-400 mt-1">Pass Ratio</p>
                  </div>
                </div>
              )}

              {/* Quiz Attempts */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-600" /> Quiz Attempts
                </h3>
                <div className="divide-y divide-slate-100">
                  {attempts.length > 0 ? (
                    attempts.map((attempt) => {
                      const quiz = quizzes.find(q => q.id === attempt.quiz_id)
                      return (
                        <div key={attempt.id} className="flex items-center justify-between py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${attempt.percentage >= 50 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                              }`}>
                              {attempt.percentage >= 50
                                ? <CheckCircle className="w-4.5 h-4.5 text-green-600" />
                                : <Target className="w-4.5 h-4.5 text-red-500" />
                              }
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">{quiz?.title}</h4>
                              <p className="text-[11px] text-slate-400">
                                {new Date(attempt.submitted_at).toLocaleDateString()} • Score: {attempt.score}/{attempt.max_score || quiz?.num_questions || quiz?.questions?.length || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-sm font-bold ${attempt.percentage >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                              {Math.round(attempt.percentage)}%
                            </span>
                            <button
                              onClick={() => navigate(`/student/quiz/${quiz?.id}`)}
                              className="text-xs text-green-600 hover:text-green-700 font-medium"
                            >
                              Retake →
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-400">No quiz attempts yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Submissions */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" /> Assignment Submissions
                </h3>
                <div className="divide-y divide-slate-100">
                  {mySubmissions.length > 0 ? (
                    mySubmissions.map((submission) => {
                      const assignment = assignments.find(a => a.id === submission.assignment_id)
                      return (
                        <div key={submission.id} className="flex items-center justify-between py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                              <FileText className="w-4.5 h-4.5 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">{assignment?.title || 'Assignment'}</h4>
                              <p className="text-[11px] text-slate-400">
                                Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {submission.score !== null ? (
                              <span className={`text-sm font-bold ${submission.score >= (assignment?.max_score * 0.7) ? 'text-green-600' : 'text-amber-600'}`}>
                                {submission.score}/{assignment?.max_score}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-lg">Pending</span>
                            )}
                            {submission.file_path && (
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/${submission.file_path}`}
                                download
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-sm text-slate-400">No submissions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Empty State */}
              {attempts.length === 0 && mySubmissions.length === 0 && (
                <div className="py-16 text-center">
                  <Award className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                  <h4 className="text-base font-bold text-slate-900 mb-2">No Activity Yet</h4>
                  <p className="text-sm text-slate-400 mb-6">Start your learning journey by taking quizzes or submitting assignments</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setActiveTab('quizzes')} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                      View Quizzes
                    </button>
                    <button onClick={() => setActiveTab('assignments')} className="px-6 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                      View Assignments
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default StudentCourseDetail
