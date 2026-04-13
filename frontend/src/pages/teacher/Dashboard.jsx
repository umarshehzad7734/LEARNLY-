import { useState, useEffect } from 'react'
import { BookOpen, Users, ClipboardList, TrendingUp, BarChart3, Layout as LayoutIcon, ArrowRight, MoreVertical, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from '../../components/Layout'
import WelcomeToast from '../../components/WelcomeToast'
import { coursesAPI, quizAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'

const TeacherDashboard = () => {
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState({ totalStudents: 0, totalQuizzes: 0 })
  const navigate = useNavigate()
  const { user } = useAuthStore()

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
      const coursesData = response.data || []

      let totalStudents = 0
      let totalQuizzes = 0

      const coursesWithStats = await Promise.all(
        coursesData.map(async (course) => {
          try {
            const studentsRes = await coursesAPI.getStudents(course.id)
            course.student_count = studentsRes.data.length || 0
            totalStudents += course.student_count

            const quizzesRes = await quizAPI.getByCourse(course.id)
            course.quiz_count = quizzesRes.data.length || 0
            totalQuizzes += course.quiz_count
          } catch (error) {
            course.student_count = 0
            course.quiz_count = 0
          }
          return course
        })
      )

      setCourses(coursesWithStats)
      setStats({ totalStudents, totalQuizzes })
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Teacher Overview">
      <WelcomeToast fullName={user?.full_name || 'Teacher'} role="teacher" />

      <div className="max-w-[1400px] mx-auto">
        {/* Welcome Header */}
        <h1 className="text-3xl font-bold text-slate-900 mb-8" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          Welcome back, {user?.full_name?.split(' ')[0] || 'Teacher'}
        </h1>

        {/* Stats Row + Top Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-8">
          {/* Stat Cards */}
          {[
            { label: 'Active Curriculum', value: courses.length, icon: BookOpen, color: '#7C3AED' },
            { label: 'Total Impact', value: stats.totalStudents, icon: Users, color: '#7C3AED' },
            { label: 'Adaptive Evals', value: stats.totalQuizzes, icon: ClipboardList, color: '#7C3AED' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-purple-50">
                <stat.icon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-xs text-slate-500 font-medium mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-slate-900">
                {String(stat.value).padStart(2, '0')}
              </h3>
            </motion.div>
          ))}

          {/* Top Courses Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all"
          >
            <h3 className="text-sm font-bold text-slate-900 mb-4">Top Courses in this month for you</h3>
            <div className="space-y-3">
              {courses.slice(0, 3).map((course, i) => (
                <div key={course.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[140px]">{course.name || course.title}</p>
                      <p className="text-[11px] text-slate-400">{course.degree_program || 'Course'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{course.student_count || 0} Enrolled</span>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-3">No courses yet</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row: My Courses Table + Upcoming Lessons */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* My Courses Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">My Course</h3>
              <button
                onClick={() => navigate('/teacher/courses')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors"
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 px-6 py-3 border-b border-slate-100 text-[11px] font-semibold text-slate-400">
              <div className="col-span-1"></div>
              <div className="col-span-5">COURSE NAME</div>
              <div className="col-span-4">PROGRESS</div>
              <div className="col-span-2 text-right">ACTIONS</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-50">
              {courses.length > 0 ? courses.slice(0, 5).map((course) => {
                const progress = course.student_count > 0 ? Math.min(Math.round((course.quiz_count / Math.max(course.student_count, 1)) * 100), 100) : 0
                return (
                  <div
                    key={course.id}
                    className="grid grid-cols-12 items-center px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/teacher/course/${course.id}`)}
                  >
                    <div className="col-span-1">
                      <div className="w-5 h-5 flex flex-col justify-center gap-[3px] text-slate-300">
                        <span className="flex gap-[3px]"><span className="w-[3px] h-[3px] rounded-full bg-current"></span><span className="w-[3px] h-[3px] rounded-full bg-current"></span></span>
                        <span className="flex gap-[3px]"><span className="w-[3px] h-[3px] rounded-full bg-current"></span><span className="w-[3px] h-[3px] rounded-full bg-current"></span></span>
                        <span className="flex gap-[3px]"><span className="w-[3px] h-[3px] rounded-full bg-current"></span><span className="w-[3px] h-[3px] rounded-full bg-current"></span></span>
                      </div>
                    </div>
                    <div className="col-span-5">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-purple-600 transition-colors truncate">{course.name || course.title}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">by {user?.full_name || 'Instructor'}</p>
                    </div>
                    <div className="col-span-4 flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 whitespace-nowrap">{course.student_count} students</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-purple-600 transition-all"
                          style={{ width: `${Math.max(progress, 10)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">{progress}%</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <button
                        className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={(e) => { e.stopPropagation(); navigate(`/teacher/course/${course.id}`) }}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              }) : (
                <div className="px-6 py-12 text-center">
                  <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No courses assigned yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Upcoming Lessons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Upcoming Lessons</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {courses.length > 0 ? courses.slice(0, 5).map((course, i) => (
                <div key={course.id} className="px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === 0 ? 'bg-purple-100' : 'bg-slate-100'}`}>
                      <Clock className={`w-4 h-4 ${i === 0 ? 'text-purple-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{course.name || course.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {i === 0 ? '5:30pm' : '9:00pm'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/teacher/course/${course.id}`)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${i === 0 ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                  >
                    Join
                  </button>
                </div>
              )) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-slate-400">No upcoming lessons</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default TeacherDashboard
