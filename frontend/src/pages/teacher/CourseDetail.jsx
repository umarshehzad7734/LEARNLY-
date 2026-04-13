import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, FileText, Trophy, Users, ArrowLeft, Upload,
  Sparkles, Brain, Loader, CheckCircle, AlertCircle, X, Mail, UserCircle, Calendar, Award, Trash2, RefreshCcw, BarChart3, TrendingUp, Zap, Cpu, Eye, Download, Clock, Edit, CheckCircle2
} from 'lucide-react'
import Layout from '../../components/Layout'
import { coursesAPI, quizAPI, assignmentAPI } from '../../utils/api'
import { AnimatePresence } from 'framer-motion'

const TeacherCourseDetail = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [materials, setMaterials] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [students, setStudents] = useState([])
  const [attempts, setAttempts] = useState([])
  const [assignments, setAssignments] = useState([])
  const [activeTab, setActiveTab] = useState('students')
  const [loading, setLoading] = useState(true)

  // Upload states
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadWeek, setUploadWeek] = useState(1)

  // Quiz generation states
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [quizData, setQuizData] = useState({
    title: '',
    topic: '',
    difficulty: 'medium',
    num_questions: 5,
    duration_minutes: 10,
    week: null,
    material_ids: [],
    model_provider: 'groq',
    is_adaptive: false
  })
  const [answerKeyTier, setAnswerKeyTier] = useState('all')
  const [generatingQuiz, setGeneratingQuiz] = useState(false)
  const [notification, setNotification] = useState(null)
  const [reindexingMaterialId, setReindexingMaterialId] = useState(null)
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false)
  const [selectedQuizForKey, setSelectedQuizForKey] = useState(null)
  const [answerKeyLoading, setAnswerKeyLoading] = useState(false)
  const [deletingMaterialId, setDeletingMaterialId] = useState(null)
  const [deletingQuizId, setDeletingQuizId] = useState(null)

  // Assignment states
  const [assignmentData, setAssignmentData] = useState({
    title: '',
    description: '',
    assignment_type: 'assignment',
    max_score: 100,
    due_date: '',
    allow_late_submission: false
  })
  const [creatingAssignment, setCreatingAssignment] = useState(false)

  // Grant retake states
  const [grantingRetakeAttemptId, setGrantingRetakeAttemptId] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentSubmissions, setStudentSubmissions] = useState([])

  // Submissions Modal states
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [selectedAssignmentForSubmissions, setSelectedAssignmentForSubmissions] = useState(null)
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([])
  const [submissionsLoading, setSubmissionsLoading] = useState(false)
  const [deletingAssignmentId, setDeletingAssignmentId] = useState(null)

  // Grading states
  const [gradingSubmissionId, setGradingSubmissionId] = useState(null)
  const [gradeData, setGradeData] = useState({})

  const sidebarItems = [
    { label: 'Overview', path: '/teacher', icon: TrendingUp },
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { label: 'Performance', path: '/teacher/analytics', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // 1. Fetch core course data first
      const courseRes = await coursesAPI.getById(courseId)
      setCourse(courseRes.data)
      setMaterials(courseRes.data.materials || [])

      // 2. Fetch auxiliary data in parallel without blocking core view
      const results = await Promise.allSettled([
        quizAPI.getByCourse(courseId),
        coursesAPI.getStudents(courseId),
        assignmentAPI.getByCourse(courseId),
        quizAPI.getCourseAttempts(courseId)
      ])

      // Handle results individually
      if (results[0].status === 'fulfilled') setQuizzes(results[0].value.data)
      if (results[1].status === 'fulfilled') setStudents(results[1].value.data)
      if (results[2].status === 'fulfilled') setAssignments(results[2].value.data)

      if (results[3].status === 'fulfilled') {
        const attemptsData = results[3].value.data || []
        console.log('[DEBUG] Fetched attempts:', attemptsData)
        setAttempts(attemptsData)
      }

      // Log errors for debugging but don't crash
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          console.error(`Auxiliary fetch ${i} failed:`, res.reason)
        }
      })

    } catch (error) {
      console.error('Failed to fetch core course data:', error)
      setCourse(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const getStudentStats = (studentId) => {
    if (!attempts || attempts.length === 0) return { avg: 0, count: 0 };

    // Convert both to strings for comparison (MongoDB ObjectIds are strings)
    const sId = String(studentId);
    const studentAttempts = attempts.filter(a => String(a.student_id) === sId);

    if (studentAttempts.length === 0) {
      return { avg: 0, count: 0 };
    }

    const sum = studentAttempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    return {
      avg: Math.round(sum / studentAttempts.length),
      count: studentAttempts.length
    };
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Delete this material? This will also remove its file and index.')) return
    setDeletingMaterialId(materialId)
    try {
      await coursesAPI.deleteMaterial(courseId, materialId)
      showNotification('success', 'Material deleted successfully')
      await fetchCourseData(true)
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Failed to delete material')
    } finally {
      setDeletingMaterialId(null)
    }
  }

  const handleReindexMaterial = async (materialId) => {
    setReindexingMaterialId(materialId)
    try {
      await coursesAPI.reindexMaterial(courseId, materialId)
      showNotification('success', 'Material reindexed successfully')
      await fetchCourseData(true)
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Failed to reindex material. Ensure Ollama is running and the embedding model is available.')
    } finally {
      setReindexingMaterialId(null)
    }
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        setTitle(selectedFile.name.split('.')[0])
      }
    }
  }


  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) {
      showNotification('error', 'Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    if (uploadWeek) formData.append('week', uploadWeek)

    console.log('Uploading material:', { title, fileName: file.name, fileType: file.type })

    setUploading(true)
    try {
      const response = await coursesAPI.uploadMaterial(courseId, formData)
      console.log('Upload successful:', response.data)

      if (response.data?.status === 'pending') {
        showNotification('success', response.data?.message || 'Material uploaded! Indexing in background.')
      } else if (response.data?.indexed) {
        showNotification('success', response.data?.message || 'Material uploaded and indexed successfully!')
      } else {
        const warn = response.data?.warning ? ` ${response.data.warning}` : ''
        const err = response.data?.error ? ` Error: ${response.data.error}` : ''
        const sug = response.data?.suggestion ? ` ${response.data.suggestion}` : ''
        showNotification('warning', (response.data?.message || 'Material uploaded but indexing failed.') + warn + err + sug)
      }

      setFile(null)
      setTitle('')
      fetchCourseData(true)
    } catch (error) {
      console.error('Upload failed:', error)
      console.error('Error response:', error.response)
      const errorMsg = error.response?.data?.detail || error.message || 'Upload failed. Please try again.'
      showNotification('error', errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateQuiz = async (e) => {
    e.preventDefault()
    console.log('[QUIZ] Submitting for generation. Selected IDs:', quizData.material_ids)
    if (!quizData.material_ids || quizData.material_ids.length === 0) {
      console.warn('[QUIZ] Validation failed: material_ids is empty!')
      showNotification('error', 'Please select at least one material to generate quiz from')
      return
    }

    setGeneratingQuiz(true)
    try {
      const response = await quizAPI.generate({
        course_id: courseId,
        title: quizData.title || null,
        topic: quizData.topic,
        difficulty: quizData.is_adaptive ? 'medium' : quizData.difficulty,
        num_questions: quizData.num_questions,
        week: quizData.week,
        material_ids: quizData.material_ids,
        model_provider: quizData.model_provider,
        is_adaptive: quizData.is_adaptive,
        duration_minutes: quizData.duration_minutes
      })

      showNotification('success', quizData.is_adaptive
        ? `Adaptive Quiz "${response.data.title}" generated with 3 difficulty tiers!`
        : `Quiz "${response.data.title}" generated and saved successfully!`
      )
      setShowQuizModal(false)
      setQuizData({ title: '', topic: '', difficulty: 'medium', num_questions: 5, duration_minutes: 10, week: null, material_ids: [], model_provider: 'groq', is_adaptive: false })
      await fetchCourseData(true)
    } catch (error) {
      console.error('Quiz generation failed:', error)
      const detail = error.response?.data?.detail || error.message
      showNotification('error', `Generation Failed: ${detail}`)
    } finally {
      setGeneratingQuiz(false)
    }
  }

  const handleViewAnswerKey = async (quizId) => {
    console.log('[DEBUG] Opening Answer Key for Quiz ID:', quizId)
    setAnswerKeyLoading(true)
    setShowAnswerKeyModal(true)
    try {
      const response = await quizAPI.getTeacherQuiz(quizId)
      setSelectedQuizForKey(response.data)
    } catch (error) {
      console.error('Failed to fetch answer key:', error)
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to load answer key'
      showNotification('error', errorMsg)
      setShowAnswerKeyModal(false)
    } finally {
      setAnswerKeyLoading(false)
    }
  }

  const handleCreateAssignment = async (e) => {
    e.preventDefault()
    setCreatingAssignment(true)
    try {
      await assignmentAPI.create({
        course_id: courseId,
        title: assignmentData.title,
        description: assignmentData.description,
        assignment_type: assignmentData.assignment_type,
        max_score: assignmentData.max_score,
        due_date: assignmentData.due_date ? new Date(assignmentData.due_date).toISOString() : null,
        allow_late_submission: assignmentData.allow_late_submission
      })

      showNotification('success', `Assignment "${assignmentData.title}" created successfully!`)
      setAssignmentData({
        title: '',
        description: '',
        assignment_type: 'assignment',
        max_score: 100,
        due_date: '',
        allow_late_submission: false
      })
      await fetchCourseData(true)
    } catch (error) {
      console.error('Assignment creation failed:', error)
      const detail = error.response?.data?.detail
      const errorMsg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(d => d.msg).join(', ')
          : 'Failed to create assignment.'
      showNotification('error', errorMsg)
    } finally {
      setCreatingAssignment(false)
    }
  }

  const handleDeleteQuiz = async (quizId, quizTitle) => {
    if (!window.confirm(`Delete quiz "${quizTitle}"? This action cannot be undone.`)) return
    setDeletingQuizId(quizId)
    try {
      await quizAPI.delete(quizId)
      showNotification('success', `Quiz "${quizTitle}" deleted successfully`)
      await fetchCourseData(true)
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Failed to delete quiz')
    } finally {
      setDeletingQuizId(null)
    }
  }

  const handleGrantRetake = async (attemptId, studentName) => {
    if (!window.confirm(`Grant retake permission to ${studentName}?`)) return
    setGrantingRetakeAttemptId(attemptId)
    try {
      await quizAPI.grantRetake(attemptId)
      showNotification('success', `Retake permission granted to ${studentName}`)
      await fetchCourseData(true)
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Failed to grant retake permission')
    } finally {
      setGrantingRetakeAttemptId(null)
    }
  }

  const handleDeleteAssignment = async (assignmentId, assignmentTitle) => {
    if (!window.confirm(`Delete assignment "${assignmentTitle}"? This will also remove all student submissions.`)) return
    setDeletingAssignmentId(assignmentId)
    try {
      await assignmentAPI.delete(assignmentId)
      showNotification('success', `Assignment "${assignmentTitle}" deleted successfully`)
      await fetchCourseData(true)
    } catch (error) {
      showNotification('error', error.response?.data?.detail || 'Failed to delete assignment')
    } finally {
      setDeletingAssignmentId(null)
    }
  }

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignmentForSubmissions(assignment)
    setShowSubmissionsModal(true)
    setSubmissionsLoading(true)
    try {
      const response = await assignmentAPI.getSubmissions(assignment.id)
      setAssignmentSubmissions(response.data)
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
      showNotification('error', 'Failed to load submissions')
    } finally {
      setSubmissionsLoading(false)
    }
  }

  const handleGradeSubmission = async (submissionId) => {
    const grade = gradeData[submissionId]

    if (!grade || grade.score === undefined || grade.score === '') {
      showNotification('error', 'Please enter a score')
      return
    }

    const score = parseFloat(grade.score)
    if (isNaN(score) || score < 0 || score > selectedAssignmentForSubmissions?.max_score) {
      showNotification('error', `Score must be between 0 and ${selectedAssignmentForSubmissions?.max_score}`)
      return
    }

    setGradingSubmissionId(submissionId)
    try {
      const response = await assignmentAPI.gradeSubmission(submissionId, {
        score: score,
        feedback: grade.feedback || null
      })

      showNotification('success', 'Grade submitted successfully!')

      // Update the submissions array with the returned graded submission
      setAssignmentSubmissions(prev =>
        prev.map(sub => sub.id === submissionId ? response.data : sub)
      )

      // Clear grade data for this submission
      setGradeData(prev => {
        const updated = { ...prev }
        delete updated[submissionId]
        return updated
      })
    } catch (error) {
      console.error('Failed to grade submission:', error)
      showNotification('error', error.response?.data?.detail || 'Failed to submit grade')
    } finally {
      setGradingSubmissionId(null)
    }
  }

  if (loading) {
    return (
      <Layout sidebarItems={sidebarItems} title="Course Details">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14BF96]"></div>
        </div>
      </Layout>
    )
  }

  if (!course) {
    return (
      <Layout sidebarItems={sidebarItems} title="Course Not Found">
        <div className="text-center py-12">
          <p className="text-gray-600">Course not found</p>
          <button onClick={() => navigate('/teacher/courses')} className="btn-primary mt-4">
            Back to Courses
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Students Overview">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border ${notification.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-800'
              : 'bg-white border-red-200 text-red-800'
              }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">My Courses</h1>
          <p className="text-sm text-slate-500">Manage your course content and students</p>
        </div>

        {/* Course Header with Hero Image */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">My Course</h2>
          <div className="flex gap-6">
            {/* Hero Banner Image */}
            <div className="relative rounded-2xl overflow-hidden w-full max-w-xl h-48 flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=600&q=80"
                alt={course.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-shrink-0"></div>
          </div>

          {/* Category Badges */}
          <div className="flex items-center gap-2 mt-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              {course.degree_program || course.code || 'Course'}
            </span>
          </div>

          {/* Course Title */}
          <h3 className="text-xl font-bold text-slate-900 mb-3">{course.title}</h3>

          {/* Stats + Action Buttons Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>30 minutes</span>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/teacher/ai-chat/${courseId}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20"
              >
                <Brain className="w-4 h-4" />
                AI Workspace
              </button>
              <button
                onClick={() => setShowQuizModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/20"
                disabled={materials.length === 0}
              >
                <Sparkles className="w-4 h-4" />
                Generate Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-8 border-b border-slate-200">
          {[
            { id: 'students', label: 'Students', icon: Users },
            { id: 'materials', label: 'Materials', icon: FileText },
            { id: 'assignments', label: 'Assignments', icon: Award },
            { id: 'quizzes', label: 'Quizzes', icon: Trophy },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id
                ? 'text-purple-600'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t"
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* Students Tab */}
          {activeTab === 'students' && (
            <div>
              {/* Students Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">Students</h3>
                  <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
                    {students.length} Enrollment
                  </span>
                  <div className="relative ml-4">
                    <input
                      type="text"
                      placeholder="Type to search"
                      className="w-56 bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                    />
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-colors bg-white">
                    <TrendingUp className="w-3.5 h-3.5" /> Sort By
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white transition-colors bg-white">
                    <FileText className="w-3.5 h-3.5" /> Filter
                  </button>
                </div>
              </div>

              {students.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-5">Student / Quiz Scores</div>
                    <div className="col-span-1 text-center">Comp.</div>
                    <div className="col-span-2 text-center">Enrolled On</div>
                    <div className="col-span-1 text-center">Avg</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-slate-50">
                    {students.map((enrollment, idx) => {
                      const student = enrollment.student || {};
                      const stats = getStudentStats(enrollment.student_id);
                      const avatarColors = ['bg-purple-200 text-purple-700', 'bg-amber-200 text-amber-700', 'bg-rose-200 text-rose-700', 'bg-emerald-200 text-emerald-700', 'bg-blue-200 text-blue-700', 'bg-indigo-200 text-indigo-700'];
                      const sId = String(enrollment.student_id);
                      const studentAttempts = attempts.filter(a => String(a.student_id) === sId);

                      const handleStudentClick = async () => {
                        setSelectedStudent({ ...student, stats })
                        try {
                          const courseAssignments = assignments || []
                          const studentSubs = []
                          for (const assignment of courseAssignments) {
                            try {
                              const subsResponse = await assignmentAPI.getSubmissions(assignment.id)
                              const studentSubmission = subsResponse.data.find(sub => sub.student_id === enrollment.student_id.toString())
                              if (studentSubmission) {
                                studentSubs.push({ ...studentSubmission, assignment_title: assignment.title, max_score: assignment.max_score })
                              }
                            } catch (err) { console.error(`Failed to fetch submissions for assignment ${assignment.id}:`, err) }
                          }
                          setStudentSubmissions(studentSubs)
                        } catch (error) {
                          console.error('Failed to fetch student submissions:', error)
                          setStudentSubmissions([])
                        }
                      }

                      return (
                        <div
                          key={enrollment.id}
                          className="grid grid-cols-12 items-center px-5 py-3 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="col-span-1 text-sm text-slate-400 font-medium">{String(idx + 1).padStart(3, '0')}</div>
                          <div className="col-span-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColors[idx % avatarColors.length]}`}>
                                {student.full_name ? student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'U'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{student.full_name || 'Unknown'}</p>
                                <p className="text-[11px] text-slate-400 mb-1">{student.email || ''}</p>
                                {studentAttempts.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {studentAttempts.map((attempt) => {
                                      const quiz = quizzes.find(q => q.id === attempt.quiz_id) || {};
                                      return (
                                        <span
                                          key={attempt.id}
                                          title={quiz.title || 'Quiz'}
                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${attempt.percentage >= 70
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                            }`}
                                        >
                                          {(quiz.title || 'Quiz').length > 15 ? (quiz.title || 'Quiz').slice(0, 15) + '…' : (quiz.title || 'Quiz')}: {attempt.percentage}%
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-1 text-center text-sm font-semibold text-emerald-600">{student.competency_score ?? 50}%</div>
                          <div className="col-span-2 text-center text-xs text-slate-500">
                            {new Date(enrollment.enrolled_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </div>
                          <div className="col-span-1 text-center text-sm font-semibold text-purple-600">{stats.avg}%</div>
                          <div className="col-span-2 text-center">
                            <button
                              onClick={handleStudentClick}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                            >
                              <UserCircle className="w-3.5 h-3.5" />
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-16 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No students enrolled yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              {/* Inline Create Form */}
              <form onSubmit={handleCreateAssignment} className="mb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Title here"
                      value={assignmentData.title}
                      onChange={(e) => setAssignmentData({ ...assignmentData, title: e.target.value })}
                      className="w-64 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                      required
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter Passing Marks"
                      value={assignmentData.max_score || ''}
                      onChange={(e) => setAssignmentData({ ...assignmentData, max_score: parseInt(e.target.value) || '' })}
                      className="w-44 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                    />
                    <input
                      type="datetime-local"
                      value={assignmentData.due_date}
                      onChange={(e) => setAssignmentData({ ...assignmentData, due_date: e.target.value })}
                      className="w-52 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingAssignment}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-purple-700 transition-colors whitespace-nowrap"
                  >
                    {creatingAssignment ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    <span>Create</span>
                  </button>
                </div>
              </form>

              {/* Assignments List - Flat Rows */}
              <div className="divide-y divide-slate-100">
                {assignments.length > 0 ? (
                  assignments.map((assignment, idx) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between py-5 group"
                    >
                      <div className="flex items-center gap-12">
                        <h4 className="text-sm font-bold text-slate-900 w-40">
                          Assignment {idx + 1}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {assignment.title}.doc
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleViewSubmissions(assignment)}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:text-purple-800 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span>
                          View Submissions
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                          disabled={deletingAssignmentId === assignment.id}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          {deletingAssignmentId === assignment.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No assignments created yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div>
              {/* Inline Upload Form */}
              <form onSubmit={handleUpload} className="mb-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="text"
                      placeholder="Title here"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-64 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                      required
                    />
                    <select
                      value={uploadWeek}
                      onChange={(e) => setUploadWeek(e.target.value)}
                      className="w-40 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                    >
                      {[...Array(16)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                      ))}
                    </select>
                    <input id="file-upload" type="file" onChange={handleFileChange} className="hidden" required />
                  </div>
                  <label
                    htmlFor="file-upload"
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 hover:text-purple-700 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </label>
                  {file && (
                    <button
                      type="submit"
                      disabled={uploading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>{uploading ? 'Uploading...' : 'Submit'}</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Materials List - Flat Rows */}
              <div className="divide-y divide-slate-100">
                {materials.length > 0 ? (
                  materials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between py-5 group"
                    >
                      <div className="flex items-center gap-12">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{mat.title}</h4>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Week {mat.week || 'N/A'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {mat.status || 'pending'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500">{mat.title}.pptx</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleReindexMaterial(mat.id)}
                          disabled={reindexingMaterialId === mat.id}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:text-purple-800 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span>
                          {reindexingMaterialId === mat.id ? 'Reindexing...' : 'View Results'}
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">No materials uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quizzes Tab */}
          {activeTab === 'quizzes' && (
            <div>
              {/* Quizzes List - Flat Rows */}
              <div className="divide-y divide-slate-100">
                {quizzes.length > 0 ? (
                  quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="flex items-center justify-between py-5 group"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{quiz.title}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {quiz.questions?.length || 0} Questions
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Created at {new Date(quiz.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewAnswerKey(quiz.id)
                          }}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:text-purple-800 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span>
                          View Answer Key
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewAnswerKey(quiz.id)
                          }}
                          className="flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:text-purple-800 transition-colors"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#7c3aed]"></span>
                          View Results
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuiz(quiz.id, quiz.title)
                          }}
                          disabled={deletingQuizId === quiz.id}
                          className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete quiz"
                        >
                          {deletingQuizId === quiz.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center">
                    <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 mb-4">No quizzes created yet</p>
                    <button
                      onClick={() => setShowQuizModal(true)}
                      disabled={materials.length === 0}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Quiz</span>
                    </button>
                    {materials.length === 0 && (
                      <p className="text-xs text-slate-400 mt-3">
                        Upload materials first to enable quiz generation
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {quizzes.length > 0 && (
                <div className="flex items-center justify-between pt-6 mt-2 border-t border-slate-100">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors">
                    <span>←</span> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    <button className="w-8 h-8 flex items-center justify-center text-sm font-semibold text-white bg-purple-600 rounded-lg">1</button>
                    {quizzes.length > 5 && (
                      <>
                        <button className="w-8 h-8 flex items-center justify-center text-sm text-slate-500 hover:bg-slate-50 rounded-lg">2</button>
                        <button className="w-8 h-8 flex items-center justify-center text-sm text-slate-500 hover:bg-slate-50 rounded-lg">3</button>
                        <span className="w-8 h-8 flex items-center justify-center text-sm text-slate-400">...</span>
                      </>
                    )}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-purple-700 border border-slate-200 rounded-lg hover:border-purple-300 transition-colors">
                    Next <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-100 p-8 rounded-[2rem] shadow-soft">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Intelligence</p>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight">{students.length}</h4>
                  <p className="text-xs text-teal-600 font-bold mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Active Users
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Generation Modal */}
      < AnimatePresence >
        {showQuizModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !generatingQuiz && setShowQuizModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Generate AI Quiz</h3>
                  <p className="text-sm text-gray-600">{course.title}</p>
                </div>
              </div>

              <form onSubmit={handleGenerateQuiz} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
                    Quiz Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm Review Quiz"
                    value={quizData.title}
                    onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
                    Model Orchestration
                  </label>
                  <div className="flex bg-slate-100 p-3 rounded-xl justify-center">
                    <div className="flex items-center gap-2.5 text-xs font-black text-slate-700">
                      <Zap className="w-3.5 h-3.5 text-[#14BF96]" />
                      GROQ (CLOUD)
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                    Select Week Filter
                  </label>
                  <select
                    value={quizData.week || ''}
                    onChange={(e) => {
                      const week = e.target.value ? parseInt(e.target.value) : null;
                      setQuizData({
                        ...quizData,
                        week: week,
                        material_ids: [] // Clear selection when week changes
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all outline-none"
                  >
                    <option value="">All Weeks</option>
                    {[...Array(16)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Materials <span className="text-teal-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                    {materials.filter(m => !quizData.week || m.week === quizData.week).length > 0 ? (
                      <>
                        <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              quizData.material_ids.length > 0 &&
                              quizData.material_ids.length === materials.filter(m => m.vector_store_id && (!quizData.week || m.week === quizData.week)).length
                            }
                            onChange={(e) => {
                              console.log('[QUIZ] Select All checked:', e.target.checked)
                              if (e.target.checked) {
                                const indexed = materials.filter(m => m.vector_store_id && (!quizData.week || m.week === quizData.week)).map(m => m.id)
                                console.log('[QUIZ] Selecting indexed materials:', indexed)
                                setQuizData({
                                  ...quizData,
                                  material_ids: indexed
                                })
                              } else {
                                setQuizData({ ...quizData, material_ids: [] })
                              }
                            }}
                            className="w-4 h-4 text-[#14BF96]"
                            disabled={generatingQuiz || materials.filter(m => m.vector_store_id && (!quizData.week || m.week === quizData.week)).length === 0}
                          />
                          <span className="font-medium text-gray-700">Select All (indexed)</span>
                        </label>
                        <div className="border-t pt-2">
                          {materials.filter(m => !quizData.week || m.week === quizData.week).map((material) => (
                            <label key={material.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={quizData.material_ids.includes(material.id)}
                                onChange={(e) => {
                                  console.log('[QUIZ] Material toggle:', material.id, e.target.checked)
                                  if (e.target.checked) {
                                    setQuizData({ ...quizData, material_ids: [...quizData.material_ids, material.id] })
                                  } else {
                                    setQuizData({ ...quizData, material_ids: quizData.material_ids.filter(id => id !== material.id) })
                                  }
                                }}
                                className="w-4 h-4 text-[#14BF96]"
                                disabled={generatingQuiz || !material.vector_store_id}
                              />
                              <span className="text-sm text-gray-700">{material.title}</span>
                              <span className="text-xs text-gray-400 ml-auto">.{material.file_type}</span>
                              {material.vector_store_id ? (
                                <span className="text-xs text-green-600 ml-2">indexed</span>
                              ) : (
                                <span className="text-xs text-teal-500 ml-2">not indexed</span>
                              )}
                            </label>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">No materials uploaded yet</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {quizData.material_ids.length} material(s) selected
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Topic (Optional)
                  </label>
                  <input
                    type="text"
                    value={quizData.topic}
                    onChange={(e) => setQuizData({ ...quizData, topic: e.target.value })}
                    placeholder="e.g., Python Basics, Variables"
                    className="input w-full"
                    disabled={generatingQuiz}
                  />
                </div>

                {/* Adaptive Toggle */}
                <div className="p-4 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-teal-600" />
                        Adaptive Quiz
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {quizData.is_adaptive
                          ? 'Generates Easy, Medium & Hard tiers — each student gets their level'
                          : 'Toggle on to auto-generate 3 difficulty tiers'}
                      </p>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={quizData.is_adaptive}
                        onChange={(e) => setQuizData({ ...quizData, is_adaptive: e.target.checked })}
                        className="sr-only"
                        disabled={generatingQuiz}
                      />
                      <div className={`w-12 h-6 rounded-full transition-all flex items-center p-1 ${quizData.is_adaptive ? 'bg-[#14BF96]' : 'bg-slate-200'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all transform ${quizData.is_adaptive ? 'translate-x-6' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </label>
                </div>

                {/* Difficulty selector — only for non-adaptive */}
                {!quizData.is_adaptive && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={quizData.difficulty}
                      onChange={(e) => setQuizData({ ...quizData, difficulty: e.target.value })}
                      className="input w-full"
                      disabled={generatingQuiz}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Questions
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={quizData.num_questions}
                      onChange={(e) => setQuizData({ ...quizData, num_questions: parseInt(e.target.value) })}
                      className="input w-full"
                      disabled={generatingQuiz}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Duration (Min)
                    </label>
                    <select
                      value={quizData.duration_minutes || ''}
                      onChange={(e) => setQuizData({ ...quizData, duration_minutes: e.target.value ? parseInt(e.target.value) : null })}
                      className="input w-full"
                      disabled={generatingQuiz}
                    >
                      <option value="">No Time Limit</option>
                      <option value="5">5 Minutes</option>
                      <option value="10">10 Minutes</option>
                      <option value="15">15 Minutes</option>
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowQuizModal(false)}
                    className="btn-secondary flex-1 rounded-2xl"
                    disabled={generatingQuiz}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex items-center justify-center gap-2 rounded-2xl"
                    disabled={generatingQuiz}
                  >
                    {generatingQuiz ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence >

      {/* Answer Key Modal */}
      < AnimatePresence >
        {showAnswerKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnswerKeyModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-premium overflow-hidden max-h-[90vh] flex flex-col"
            >
              {answerKeyLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <Loader className="w-10 h-10 text-[#14BF96] animate-spin" />
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Decrypting Key...</p>
                </div>
              ) : selectedQuizForKey && (
                <>
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-soft">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Answer Key</h3>
                        <p className="text-[10px] font-black text-[#14BF96] uppercase tracking-widest truncate max-w-[300px]">{selectedQuizForKey.title}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAnswerKeyModal(false)}
                      className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-slate-100"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Tier selector for adaptive quizzes */}
                  {selectedQuizForKey.is_adaptive && selectedQuizForKey.questions_by_tier && (
                    <div className="px-8 pt-4 flex gap-2">
                      {['all', 'easy', 'medium', 'hard'].map(tier => (
                        <button
                          key={tier}
                          onClick={() => setAnswerKeyTier(tier)}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${answerKeyTier === tier
                            ? tier === 'easy' ? 'bg-green-100 text-green-800 border-2 border-green-300'
                              : tier === 'medium' ? 'bg-amber-100 text-amber-800 border-2 border-amber-300'
                                : tier === 'hard' ? 'bg-red-100 text-red-800 border-2 border-red-300'
                                  : 'bg-slate-900 text-white border-2 border-slate-900'
                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {tier === 'all' ? 'All Tiers' : tier}
                          {tier !== 'all' && selectedQuizForKey.questions_by_tier[tier] && (
                            <span className="ml-1.5 opacity-70">({selectedQuizForKey.questions_by_tier[tier].length})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {(selectedQuizForKey.is_adaptive && selectedQuizForKey.questions_by_tier && answerKeyTier !== 'all'
                      ? (selectedQuizForKey.questions_by_tier[answerKeyTier] || [])
                      : selectedQuizForKey.questions
                    ).map((q, idx) => (
                      <div key={q.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-teal-100 transition-colors">
                        <div className="flex items-start gap-4 mb-4">
                          <span className="w-10 h-10 flex-shrink-0 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-900">
                            {idx + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900 leading-relaxed pt-2.5">{q.question_text}</p>
                            {selectedQuizForKey.is_adaptive && q.difficulty && (
                              <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${q.difficulty === 'easy' ? 'bg-green-100 text-green-700'
                                : q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>{q.difficulty}</span>
                            )}
                          </div>
                        </div>

                        <div className="ml-14 space-y-3">
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Authenticated Response</p>
                            <p className="text-sm font-bold text-emerald-900">{q.correct_answer}</p>
                          </div>
                          {q.explanation && (
                            <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                              <p className="text-[10px] font-black text-[#14BF96] uppercase tracking-widest mb-1">Pedagogical Insight</p>
                              <p className="text-xs font-medium text-indigo-900 leading-relaxed italic">"{q.explanation}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-slate-900/5 border-t border-slate-100 flex justify-end p-6">
                    <button
                      onClick={() => setShowAnswerKeyModal(false)}
                      className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-soft hover:bg-slate-800 transition-all"
                    >
                      Dismiss View
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence >

      {/* Submissions Modal */}
      < AnimatePresence >
        {showSubmissionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSubmissionsModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-premium overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-premium">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Mission Transmission Log</h3>
                    <p className="text-[10px] font-black text-[#14BF96] uppercase tracking-widest mt-1">
                      {selectedAssignmentForSubmissions?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all border border-slate-100 hover:rotate-90"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
                {submissionsLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-slate-100 border-t-[#14BF96] rounded-full animate-spin" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Scanning Secure Uplink...</p>
                  </div>
                ) : assignmentSubmissions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {assignmentSubmissions.map((sub, idx) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-premium hover:border-teal-100 transition-all group"
                      >
                        <div className="space-y-6">
                          {/* Student Info and Submission */}
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
                            <div className="flex items-center gap-5 shrink-0">
                              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 text-xl font-black border-2 border-white shadow-soft group-hover:bg-[#14BF96] group-hover:text-white transition-all">
                                {sub.student_name?.charAt(0) || 'S'}
                              </div>
                              <div>
                                <p className="text-lg font-black text-slate-900 tracking-tight">{sub.student_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {new Date(sub.submitted_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                              {sub.file_path && (
                                <a
                                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/${sub.file_path.replace(/\\/g, '/')}`}
                                  download={`${sub.student_name?.replace(/\s+/g, '_') || 'Student'}_${sub.student_email || 'no-email'}${sub.file_path ? sub.file_path.substring(sub.file_path.lastIndexOf('.')) : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#14BF96] transition-all shadow-premium"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download Submission</span>
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Submission Text */}
                          {sub.submission_text && (
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 group-hover:bg-white transition-all">
                              <p className="text-[10px] text-[#14BF96] font-black uppercase tracking-widest mb-2">Transmission Data</p>
                              <p className="text-sm text-slate-600 leading-relaxed font-medium italic">"{sub.submission_text}"</p>
                            </div>
                          )}

                          {/* Grading Section */}
                          {sub.score !== null ? (
                            // Already graded - show grade and feedback
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-100">
                              <div className="flex items-start justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Evaluated</p>
                                      <p className="text-2xl font-black text-emerald-900">{sub.score} / {selectedAssignmentForSubmissions?.max_score}</p>
                                    </div>
                                  </div>

                                  {sub.feedback && (
                                    <div className="bg-white/60 rounded-2xl p-4 border border-emerald-100/50">
                                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2">Instructor Feedback</p>
                                      <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{sub.feedback}"</p>
                                    </div>
                                  )}

                                  {sub.graded_at && (
                                    <p className="text-[10px] text-emerald-600/60 font-bold">
                                      Graded on {new Date(sub.graded_at).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Not graded yet - show grading form
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-amber-100">
                              <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                                  <Edit className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Grade Submission</p>
                                  <p className="text-xs text-amber-700 font-medium">Enter score and optional feedback</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Score (Max: {selectedAssignmentForSubmissions?.max_score})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={selectedAssignmentForSubmissions?.max_score}
                                    step="0.5"
                                    placeholder="0"
                                    value={gradeData[sub.id]?.score || ''}
                                    onChange={(e) => setGradeData(prev => ({
                                      ...prev,
                                      [sub.id]: { ...prev[sub.id], score: e.target.value }
                                    }))}
                                    className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] outline-none transition-all font-black text-slate-900 text-center"
                                  />
                                </div>

                                <div className="lg:col-span-2">
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                    Feedback (Optional)
                                  </label>
                                  <textarea
                                    placeholder="Provide constructive feedback for the student..."
                                    value={gradeData[sub.id]?.feedback || ''}
                                    onChange={(e) => setGradeData(prev => ({
                                      ...prev,
                                      [sub.id]: { ...prev[sub.id], feedback: e.target.value }
                                    }))}
                                    className="w-full px-4 py-3 bg-white border border-amber-100 rounded-xl focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400 resize-none"
                                    rows="2"
                                  />
                                </div>
                              </div>

                              <button
                                onClick={() => handleGradeSubmission(sub.id)}
                                disabled={gradingSubmissionId === sub.id}
                                className="w-full py-4 bg-[#14BF96] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-premium hover:shadow-[#14BF96]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                              >
                                {gradingSubmissionId === sub.id ? (
                                  <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    <span>Submitting Grade...</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>Submit Grade</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px]">
                    <Users className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">No transmissions detected</h4>
                    <p className="text-sm font-medium text-slate-400">Waiting for students to transmit mission data.</p>
                  </div>
                )}
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-premium hover:bg-slate-800 transition-all"
                >
                  Close Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence >

      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-premium overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#14BF96] rounded-2xl flex items-center justify-center text-white shadow-soft">
                    <UserCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedStudent.full_name}</h3>
                    <p className="text-sm text-[#14BF96] font-bold">{selectedStudent.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Academic Level</p>
                    <p className="text-sm font-bold text-slate-700">Semester {selectedStudent.semester || 'N/A'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance Index</p>
                    <p className={`text-sm font-bold ${selectedStudent.stats.avg >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedStudent.stats.avg}% Mean Score
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#14BF96]/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-[#14BF96] uppercase tracking-widest mb-1">Global Competency Score</p>
                      <h4 className="text-3xl font-black">{selectedStudent.competency_score || 0}</h4>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                      <TrendingUp className="w-8 h-8 text-[#14BF96]" />
                    </div>
                  </div>
                  <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedStudent.competency_score || 0}%` }}
                      className="h-full bg-[#14BF96]"
                    />
                  </div>
                </div>


                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#14BF96]" />
                    Performance Overview
                  </h4>

                  {/* Quiz Attempts */}
                  <div className="mb-6">
                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Quiz Attempts</h5>
                    <div className="space-y-3">
                      {attempts.filter(a => a.student_id === selectedStudent.id).length > 0 ? (
                        attempts
                          .filter(a => a.student_id === selectedStudent.id)
                          .map((attempt) => {
                            const quiz = quizzes.find(q => q.id === attempt.quiz_id) || {};
                            return (
                              <div key={attempt.id} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between hover:shadow-soft transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                    <Trophy className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{quiz.title || 'Untitled Quiz'}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                      {new Date(attempt.completed_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-black ${attempt.percentage >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {attempt.percentage}%
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Score</p>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs font-medium text-slate-400">No quiz attempts recorded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assignment Submissions */}
                  <div>
                    <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-2">Assignment Submissions</h5>
                    <div className="space-y-3">
                      {studentSubmissions.length > 0 ? (
                        studentSubmissions.map((submission) => (
                          <div key={submission.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between hover:shadow-soft transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{submission.assignment_title || 'Assignment'}</p>
                                <p className="text-[10px] text-slate-500 font-medium">
                                  {new Date(submission.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {submission.score !== null ? (
                                <>
                                  <p className={`text-sm font-black ${submission.score >= (submission.max_score * 0.7) ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {submission.score} / {submission.max_score}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Points</p>
                                </>
                              ) : (
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                  Ungraded
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-xs font-medium text-slate-400">No assignment submissions recorded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-soft hover:bg-slate-800 transition-all"
                >
                  Close Insights
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout >
  )
}

export default TeacherCourseDetail
