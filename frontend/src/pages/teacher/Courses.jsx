import { useState, useEffect } from 'react'
import { BookOpen, Upload, FileText, CheckCircle, AlertCircle, X, Loader, Users, BarChart3, Layout as LayoutIcon, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../../components/Layout'
import { coursesAPI, quizAPI } from '../../utils/api'
import { useNavigate } from 'react-router-dom'


const TeacherCourses = () => {
  const [courses, setCourses] = useState([])
  const [notification, setNotification] = useState(null)
  const navigate = useNavigate()

  const sidebarItems = [
    { label: 'Overview', path: '/teacher', icon: LayoutIcon },
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { label: 'Performance', path: '/teacher/analytics', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll()
      setCourses(response.data || [])
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Teachers Overview">
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">My Courses</h1>
          <p className="text-sm text-slate-500">Manage your assigned courses and curriculum</p>
        </div>

        {/* Course Cards Grid */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">My Course</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.length > 0 ? (
              courses.map((course, idx) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                  onClick={() => navigate(`/teacher/course/${course.id}`)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                >
                  {/* Course Header */}
                  <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-indigo-300" />
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-100 text-purple-700">
                      {course.degree_program || 'Course'}
                    </span>
                  </div>

                  {/* Course Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{course.name || course.title}</h3>
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description || 'No description available'}</p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{course.enrollment_count || 0} enrolled</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{course.materials?.length || 0} materials</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-400 mb-1">No Courses Assigned</h3>
                <p className="text-sm text-slate-400">Contact an admin to assign courses to your account.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default TeacherCourses
