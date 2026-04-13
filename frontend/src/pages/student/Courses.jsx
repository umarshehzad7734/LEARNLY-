import { useState, useEffect } from 'react'
import { BookOpen, Plus, CheckCircle, ChevronRight, Layout as LayoutIcon, BarChart3, Clock, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import { coursesAPI, quizAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'


const StudentCourses = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const sidebarItems = [
    { label: 'Dashboard', path: '/student', icon: LayoutIcon },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const [enrolledRes, availableRes] = await Promise.all([
        coursesAPI.getAll(),
        coursesAPI.getAvailableForStudent()
      ])
      const enrolled = enrolledRes.data || []
      setEnrolledCourses(enrolled)
      // Filter out already enrolled courses from available
      const enrolledIds = enrolled.map(c => c.id)
      const filtered = (availableRes.data || []).filter(c => !enrolledIds.includes(c.id))
      setAvailableCourses(filtered)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async (courseId) => {
    try {
      await coursesAPI.enroll({
        course_id: courseId,
        student_id: user.id
      })
      fetchCourses()
    } catch (error) {
      console.error('Enrollment failed:', error)
      alert(error.response?.data?.detail || 'Failed to enroll in course')
    }
  }

  // Color palette for course cards
  const cardColors = ['bg-emerald-50', 'bg-blue-50', 'bg-purple-50', 'bg-amber-50', 'bg-rose-50', 'bg-cyan-50']

  if (loading) {
    return (
      <Layout sidebarItems={sidebarItems} title="Students Overview">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Students Overview">
      <div className="max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Courses</h1>
          <p className="text-sm text-slate-400 mt-1">Browse and manage your enrolled courses.</p>
        </div>

        {/* My Courses Section */}
        {enrolledCourses.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-5">My Course</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {enrolledCourses.map((course, idx) => (
                <div
                  key={course.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => navigate(`/student/course/${course.id}`)}
                >
                  {/* Course Header */}
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-indigo-300" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-green-100 text-green-700">
                      {course.course_code || 'Course'}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description || 'No description available'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.teacher_name || 'Instructor'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{course.materials?.length || 0} materials</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {enrolledCourses.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl py-16 text-center mb-10">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Courses Yet</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">You haven't enrolled in any courses. Browse available courses below.</p>
          </div>
        )}

        {/* Available Courses Section */}
        {availableCourses.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-5">Available Courses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {availableCourses.map((course, idx) => (
                <div
                  key={course.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Course Header */}
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-indigo-300" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-green-100 text-green-700">
                      {course.course_code || 'Course'}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description || 'No description available'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.teacher_name || 'Instructor'}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEnroll(course.id)
                        }}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Enroll
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {availableCourses.length === 0 && enrolledCourses.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">You're All Set!</h3>
            <p className="text-sm text-slate-400">You are already enrolled in all available courses.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default StudentCourses
