import { useState, useEffect } from 'react'
import { BookOpen, Trophy, TrendingUp, ArrowRight, Layout as LayoutIcon, BarChart3, ChevronRight, Clock, FileText, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../components/Layout'
import WelcomeToast from '../../components/WelcomeToast'
import { coursesAPI, quizAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'

const StudentDashboard = () => {
  const [courses, setCourses] = useState([])
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const sidebarItems = [
    { label: 'Dashboard', path: '/student', icon: LayoutIcon },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [coursesRes, attemptsRes] = await Promise.all([
        coursesAPI.getAll(),
        quizAPI.getMyAttempts()
      ])
      setCourses(coursesRes.data || [])
      setAttempts(attemptsRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const avgScore = attempts.length > 0
    ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
    : 0

  // Collect all materials from all courses
  const allMaterials = courses.flatMap(c => (c.materials || []).map(m => ({ ...m, courseName: c.title })))

  return (
    <Layout sidebarItems={sidebarItems} title="Students Overview">
      <WelcomeToast fullName={user?.full_name || 'Student'} role="student" />

      <div className="max-w-[1400px] mx-auto">
        {/* Welcome Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Here's what's happening with your courses today.</p>
        </div>

        {/* Top Row: Stats + Resources + Top Courses */}
        <div className="grid grid-cols-12 gap-5 mb-6">
          {/* Total Hours Spent */}
          <div className="col-span-12 md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Clock className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Total Resources</p>
            <p className="text-2xl font-bold text-slate-900">{allMaterials.length > 0 ? allMaterials.length : 0}</p>
          </div>

          {/* Your Test Results */}
          <div className="col-span-12 md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <Trophy className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-slate-400 font-medium mb-1">Your Test Results</p>
            <p className="text-2xl font-bold text-green-600">{avgScore}%</p>
          </div>

          {/* Your Resources */}
          <div className="col-span-12 md:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Your Resources</h3>
            <div className="space-y-3">
              {allMaterials.slice(0, 4).map((mat, idx) => (
                <div key={mat.id || idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${mat.file_path?.endsWith('.pdf') ? 'bg-red-500' :
                    mat.file_path?.endsWith('.pptx') || mat.file_path?.endsWith('.ppt') ? 'bg-orange-500' :
                      mat.file_path?.endsWith('.docx') || mat.file_path?.endsWith('.doc') ? 'bg-blue-500' :
                        'bg-green-500'
                    }`}>
                    {mat.file_path?.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'FIL'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{mat.title}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                      <div className="bg-green-500 h-1 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {mat.file_path?.split('.').pop()?.toUpperCase() || 'File'}
                  </span>
                  <span className="text-[10px] text-green-600 font-medium cursor-pointer hover:underline">Download</span>
                </div>
              ))}
              {allMaterials.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No resources yet</p>
              )}
            </div>
            {allMaterials.length > 4 && (
              <button className="w-full text-center text-xs text-slate-500 font-medium mt-3 pt-3 border-t border-slate-100 hover:text-green-600">
                See more
              </button>
            )}
          </div>

          {/* Top Courses */}
          <div className="col-span-12 md:col-span-4 bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Top Courses in this month for you</h3>
            <div className="space-y-4">
              {courses.slice(0, 3).map((course, idx) => (
                <div key={course.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors" onClick={() => navigate(`/student/course/${course.id}`)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${idx === 0 ? 'bg-green-100 text-green-600' :
                    idx === 1 ? 'bg-purple-100 text-purple-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{course.title}</p>
                    <p className="text-[11px] text-slate-400">{course.course_code || 'Course'}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">{course.materials?.length || 0} Topics</span>
                </div>
              ))}
              {courses.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">No courses enrolled</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Row: My Course Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-5">My Course</h3>

          {/* Table Header */}
          <div className="grid grid-cols-12 text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
            <div className="col-span-5">Course Name</div>
            <div className="col-span-4">Progress</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-50">
            {courses.length > 0 ? courses.map((course) => {
              const materialCount = course.materials?.length || 0
              const progressPercent = materialCount > 0 ? Math.min(Math.round((materialCount / 15) * 100), 100) : 0
              return (
                <div
                  key={course.id}
                  className="grid grid-cols-12 items-center py-4 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/student/course/${course.id}`)}
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-2 h-8 bg-slate-200 rounded-full"></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                      <p className="text-[11px] text-slate-400">by {course.teacher_name || 'Instructor'}</p>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="text-xs text-slate-400 whitespace-nowrap">{materialCount} materials</span>
                    <div className="flex-1 max-w-[120px] bg-slate-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(materialCount * 10, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            }) : (
              <div className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No courses enrolled yet</p>
                <button
                  onClick={() => navigate('/student/courses')}
                  className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Explore Courses
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentDashboard
