import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, X, Edit2, Trash2, Users, BarChart3, Shield, TrendingUp, Clock, User, Calendar, Search, Filter, Building2 } from 'lucide-react'
import Layout from '../../components/Layout'
import { coursesAPI, usersAPI, departmentsAPI } from '../../utils/api'


// Category colors
const categoryColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const Courses = () => {
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [departments, setDepartments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    teacher_id: '',
    semester: '',
    degree_types: ''
  })

  const sidebarItems = [
    { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
    { label: 'Directory', path: '/admin/users', icon: Users },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Governance', path: '/admin/moderation', icon: Shield },
    { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ]

  useEffect(() => {
    fetchCourses()
    fetchTeachers()
    fetchDepartments()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll()
      setCourses(response.data)
    } catch (error) {
      console.error('Failed to fetch courses:', error)
    }
  }

  const fetchTeachers = async () => {
    try {
      const response = await usersAPI.getAll()
      const teachersList = response.data.filter(user => user.role === 'teacher')
      setTeachers(teachersList)
    } catch (error) {
      console.error('Failed to fetch teachers:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll()
      setDepartments(response.data)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingCourse) {
        await coursesAPI.update(editingCourse.id, formData)
      } else {
        await coursesAPI.create(formData)
      }
      fetchCourses()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to save course:', error)
      alert('Failed to save course: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleEdit = (course) => {
    setEditingCourse(course)
    setFormData({
      title: course.title || course.name || '',
      description: course.description || '',
      teacher_id: course.teacher_id || '',
      semester: course.semester || '',
      degree_types: course.degree_types || course.degree_program || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return
    try {
      await coursesAPI.delete(courseId)
      fetchCourses()
    } catch (error) {
      console.error('Failed to delete course:', error)
    }
  }

  const resetForm = () => {
    setFormData({ title: '', description: '', teacher_id: '', semester: '', degree_types: '' })
    setEditingCourse(null)
  }

  const filteredCourses = searchTerm
    ? courses.filter(c => (c.title || c.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : courses

  return (
    <Layout sidebarItems={sidebarItems} title="Course Management">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Course Management</h1>
          <p className="text-sm text-slate-500">{courses.length} courses available</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Provision Course
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96]"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-white transition-colors bg-white">
          <Filter className="w-4 h-4 text-slate-400" />
          Filter
        </button>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all group"
          >
            {/* Course Header */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-200 flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-indigo-300" />
              <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${categoryColors[index % categoryColors.length]}`}>
                {course.degree_types || course.degree_program || 'Course'}
              </span>
              {/* Action buttons on hover */}
              <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(course) }}
                  className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-slate-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(course.id) }}
                  className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Course Info */}
            <div className="p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{course.title || course.name}</h3>
              <p className="text-xs text-slate-500 mb-3 line-clamp-2">{course.description || 'No description available'}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>16 Weeks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{course.enrollment_count || 0} enrolled</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No courses found</p>
        </div>
      )}

      {/* Course Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingCourse ? 'Edit Course' : 'Create New Course'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Course Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96]"
                    placeholder="e.g. Introduction to Computer Science"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value ? parseInt(e.target.value) : '' })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] bg-white"
                    >
                      <option value="">Select Semester</option>
                      {[...Array(departments.find(d => d.name === formData.degree_types)?.total_semesters || 8)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Degree Program</label>
                    <select
                      value={formData.degree_types}
                      onChange={(e) => setFormData({ ...formData, degree_types: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] bg-white"
                    >
                      <option value="">Select Program</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] resize-none"
                    rows={3}
                    placeholder="Brief course description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assign Teacher</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] bg-white"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    {editingCourse ? 'Save Changes' : 'Create Course'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}

export default Courses
