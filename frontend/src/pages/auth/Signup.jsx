import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader, CheckCircle, ArrowRight, ChevronDown } from 'lucide-react'
import { authAPI, departmentsAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { initGoogleAuth, renderGoogleButton } from '../../utils/googleAuth'

const Signup = () => {
  const { role: routeRole } = useParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: routeRole || 'student',
    semester: '',
    degree_type: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [successMessage, setSuccessMessage] = useState('')
  const [departments, setDepartments] = useState([])

  const { setAuth, user, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && token) {
      navigate(`/${user.role}`)
    }
    if (routeRole && ['student', 'teacher', 'admin'].includes(routeRole)) {
      setFormData(prev => ({ ...prev, role: routeRole }))
    }
  }, [user, token, navigate, routeRole])

  useEffect(() => {
    departmentsAPI.getAll().then(res => setDepartments(res.data)).catch(() => { })
  }, [])

  useEffect(() => {
    const setupGoogle = async () => {
      await initGoogleAuth()
      renderGoogleButton('google-signup-button', async (credential) => {
        setLoading(true)
        setError('')
        try {
          const response = await authAPI.googleAuth(credential)
          setAuth(response.data)
          navigate(`/${response.data.user.role}`)
        } catch (err) {
          setError(err.response?.data?.detail || 'Google signup failed')
        } finally {
          setLoading(false)
        }
      })
    }
    setupGoogle()
  }, [navigate, setAuth])

  const handleGoogleClick = () => {
    // Handled by Google button
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate password matches backend requirements
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter')
      return
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter')
      return
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one digit')
      return
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*)')
      return
    }

    setLoading(true)

    try {
      const { confirmPassword, phone, semester, degree_type, ...baseData } = formData

      const signupData = formData.role === 'student'
        ? { ...baseData, semester, degree_type }
        : baseData

      const response = await authAPI.signup(signupData)
      setSuccessMessage(response.data.message)
      setLoading(false)
    } catch (err) {
      console.error('Signup error:', err.response?.data)
      // Handle Pydantic validation error format (array of errors)
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        const messages = detail.map(e => e.msg?.replace('Value error, ', '') || e.msg || JSON.stringify(e))
        setError(messages.join('. '))
      } else {
        setError(detail || 'Signup failed. Please try again.')
      }
      setLoading(false)
    }
  }

  const roleLabels = { student: 'Student', teacher: 'Faculty', admin: 'Administrator' }

  // Success screen
  if (successMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-[#14BF96]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#14BF96]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Account Created!</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">
            {successMessage}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#0B4D3B] hover:bg-[#093D2F] text-white font-semibold text-sm transition-all"
          >
            <ArrowRight className="w-5 h-5" />
            <span>Go to Login</span>
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Photo Background */}
      <div className="hidden lg:block lg:w-[48%] relative">
        <img
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80"
          alt="Team collaborating"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-[52%] flex flex-col min-h-screen bg-white">
        <div className="flex-1 flex items-center justify-center px-6 md:px-16 lg:px-20 py-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[440px]"
          >
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl md:text-[36px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                Sign Up
              </h1>
              <p className="text-sm text-[#14BF96] font-medium">
                Sign up to join
              </p>
            </div>

            {/* Social Buttons */}
            <div className="flex gap-3 mb-5">
              <div id="google-signup-button" className="flex-1 min-h-[44px]"></div>
              {/* <button
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0B4D3B] text-white rounded-lg hover:bg-[#093D2F] transition-colors font-medium text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Sign up with Facebook
              </button> */}
            </div>

            {/* Divider */}
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-medium">or sign up with</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-lg mb-5 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                    placeholder="Name here"
                    required
                  />
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                  placeholder="johndoe@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                    placeholder="at least 8 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Phone number
                </label>
                <div className="flex">
                  <div className="flex items-center gap-1.5 px-3 border border-slate-300 border-r-0 rounded-l-lg bg-slate-50 text-sm text-slate-600">
                    <span className="text-base">🇵🇰</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1 border border-slate-300 rounded-r-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                    placeholder="+92 00 000000"
                  />
                </div>
              </div>

              {/* Student-specific fields */}
              {formData.role === 'student' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Semester</label>
                    <select
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] bg-white"
                      required
                    >
                      <option value="">Select</option>
                      {[...Array(departments.find(d => d.name === formData.degree_type)?.total_semesters || 8)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Semester {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Degree</label>
                    <select
                      value={formData.degree_type}
                      onChange={(e) => setFormData({ ...formData, degree_type: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] bg-white"
                      required
                    >
                      <option value="">Select</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Remember Me */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-[#14BF96] focus:ring-[#14BF96]/20 cursor-pointer accent-[#0B4D3B]"
                />
                <label htmlFor="rememberMe" className="text-sm text-slate-600 font-medium cursor-pointer">
                  Remember Me
                </label>
              </div>

              {/* Sign Up Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-[#0B4D3B] hover:bg-[#093D2F] text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-lg shadow-[#0B4D3B]/20"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Sign up'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="text-center text-sm text-slate-500 mt-6 font-medium">
              Already have an Account?{' '}
              <Link
                to={routeRole ? `/login/${routeRole}` : "/login"}
                className="text-slate-900 font-bold hover:text-[#14BF96] transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Bottom Role Links */}
        <div className="py-4 text-center border-t border-slate-100">
          <span className="text-xs text-slate-400">Sign up as </span>
          {['teacher', 'admin', 'student'].map((r, i) => (
            <span key={r}>
              <Link
                to={`/signup/${r}`}
                className={`text-xs font-semibold transition-colors ${formData.role === r ? 'text-[#14BF96]' : 'text-[#14BF96] hover:text-[#0FA080]'}`}
              >
                {roleLabels[r]}
              </Link>
              {i < 2 && <span className="text-xs text-slate-300 mx-1">|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Signup
