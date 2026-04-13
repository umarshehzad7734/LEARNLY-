import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User, Mail, Camera, Save, X, BookOpen, GraduationCap, Award, Calendar, ShieldCheck, BadgeCheck, BarChart3, Shield, TrendingUp, Users, Building2
} from 'lucide-react'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { usersAPI, authAPI, departmentsAPI } from '../utils/api'

const Profile = () => {
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [departments, setDepartments] = useState([])
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    semester: '',
    degree_type: ''
  })

  const sidebarItems = user?.role === 'admin' ? [
    { label: 'Dashboard', path: '/admin', icon: BarChart3 },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Courses', path: '/admin/courses', icon: BookOpen },
    { label: 'Moderation', path: '/admin/moderation', icon: Shield },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ] : user?.role === 'teacher' ? [
    { label: 'Overview', path: '/teacher', icon: TrendingUp },
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { label: 'Performance', path: '/teacher/analytics', icon: BarChart3 },
  ] : [
    { label: 'Dashboard', path: '/student', icon: TrendingUp },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: TrendingUp },
  ]

  useEffect(() => {
    if (user?.avatar) {
      setAvatarPreview(`http://localhost:8000/${user.avatar}`)
    }
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '',
        semester: user.semester || '',
        degree_type: user.degree_type || ''
      })
    }
  }, [user])

  useEffect(() => {
    departmentsAPI.getAll().then(res => setDepartments(res.data)).catch(() => { })
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', avatarFile)

      const response = await usersAPI.uploadAvatar(formData)

      // Refresh user data
      const userResponse = await authAPI.getMe()
      updateUser(userResponse.data)

      alert('Profile picture updated successfully!')
      setAvatarFile(null)
    } catch (error) {
      alert('Failed to upload avatar: ' + (error.response?.data?.detail || error.message))
    } finally {
      setUploading(false)
    }
  }

  const handleAvatarDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return

    setUploading(true)
    try {
      await usersAPI.deleteAvatar()

      // Refresh user data
      const userResponse = await authAPI.getMe()
      updateUser(userResponse.data)

      setAvatarPreview(null)
      alert('Profile picture deleted successfully!')
    } catch (error) {
      console.error('Delete avatar error:', error)
      const errorMsg = error.response?.data?.detail
        ? (typeof error.response.data.detail === 'object' ? JSON.stringify(error.response.data.detail) : error.response.data.detail)
        : error.message
      alert('Failed to delete avatar: ' + errorMsg)
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProfileUpdate = async () => {
    setLoading(true)
    try {
      const payload = {
        ...formData,
        semester: formData.semester ? parseInt(formData.semester) : null
      }
      const response = await usersAPI.updateProfile(payload)
      updateUser(response.data)
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      alert('Failed to update profile: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (!user) return null

  return (
    <Layout sidebarItems={sidebarItems} title="Profile Settings">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 bg-[#14BF96] text-white rounded-xl font-bold text-sm shadow-soft hover:bg-[#0FA080] transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={loading}
                className="px-6 py-2.5 bg-[#14BF96] text-white rounded-xl font-bold text-sm shadow-soft hover:bg-[#0FA080] transition-all flex items-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Profile Picture Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Profile Photo</h2>
              <p className="text-sm text-slate-500 font-medium">Update your profile picture and avatar</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar Display */}
            <div className="relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-40 h-40 rounded-3xl object-cover border-4 border-slate-50 shadow-soft transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="w-40 h-40 rounded-3xl bg-[#14BF96] flex items-center justify-center text-white text-4xl font-bold border-4 border-slate-50 shadow-soft transition-transform group-hover:scale-[1.02]">
                  {getInitials(user.full_name)}
                </div>
              )}

              {/* Upload Button Overlay */}
              <label className="absolute -bottom-2 -right-2 bg-white border border-slate-200 text-slate-600 p-3 rounded-2xl cursor-pointer shadow-premium hover:text-[#14BF96] hover:border-teal-100 transition-all">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Upload Controls */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">Upload new image</p>
                <p className="text-xs text-slate-400 font-medium max-w-sm">
                  Recommended size: 400x400px. Max file size: 5MB. Supports JPG, PNG, WEBP.
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {avatarFile && (
                  <>
                    <button
                      onClick={handleAvatarUpload}
                      disabled={uploading}
                      className="btn-primary py-2.5 px-6 text-xs font-bold shadow-soft flex items-center gap-2"
                    >
                      {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Changes</span>
                    </button>
                    <button
                      onClick={() => {
                        setAvatarFile(null)
                        setAvatarPreview(user?.avatar ? `http://localhost:8000/${user.avatar}` : null)
                      }}
                      className="btn-secondary py-2.5 px-6 text-xs font-bold flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Discard</span>
                    </button>
                  </>
                )}
                {user.avatar && !avatarFile && (
                  <button
                    onClick={handleAvatarDelete}
                    disabled={uploading}
                    className="py-2.5 px-6 text-xs font-bold text-teal-600 hover:bg-teal-50 rounded-xl border border-transparent hover:border-teal-100 transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Remove Profile Photo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>

          <h2 className="text-xl font-bold text-slate-900 mb-8 relative z-10">Account Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14BF96]"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-700">{user.full_name}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14BF96]"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-700">{user.email}</span>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">New Password (Optional)</label>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current"
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14BF96]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Account Role</label>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-700 capitalize">{user.role}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Joined Learnly</label>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-slate-700">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Student-specific fields */}
            {user.role === 'student' && (
              <>
                <div className="col-span-2 pt-4">
                  <div className="h-px bg-slate-100 w-full mb-8"></div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Academic Level</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    {isEditing ? (
                      <select
                        name="semester"
                        value={formData.semester}
                        onChange={handleInputChange}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14BF96]"
                      >
                        {[...Array(departments.find(d => d.name === formData.degree_type)?.total_semesters || 8)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-bold text-slate-700">Semester {user.semester}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Program</label>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-soft flex items-center justify-center text-slate-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    {isEditing ? (
                      <select
                        name="degree_type"
                        value={formData.degree_type}
                        onChange={handleInputChange}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#14BF96]"
                      >
                        <option value="">Select Program</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-bold text-slate-700">{user.degree_type}</span>
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="bg-[#14BF96] rounded-3xl p-8 text-white shadow-premium relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-red-200" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-red-200">Competency Level</span>
                        </div>
                        <h4 className="text-2xl font-bold">
                          {user.competency_score < 40 ? 'Learning Beginner' :
                            user.competency_score < 70 ? 'Intermediate Professional' : 'Advanced Specialist'}
                        </h4>
                        <p className="text-red-100 text-xs font-medium opacity-80">Your score is based on quiz performance and course participation.</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-3xl font-bold">{user.competency_score}</span>
                          <span className="text-red-200 text-sm font-bold ml-1">/ 100</span>
                        </div>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                          <TrendingUp className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="w-full bg-indigo-900/30 rounded-full h-3 backdrop-blur-md overflow-hidden p-0.5 border border-[#14BF96]/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${user.competency_score}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="bg-white h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Status Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <BadgeCheck className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-700">Account Status</span>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-teal-50 text-rose-700 border border-teal-100'
              }`}>
              {user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[#14BF96]">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold text-slate-700">Email Verification</span>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.is_verified ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
              {user.is_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </motion.div >
      </div >
    </Layout >
  )
}

export default Profile
