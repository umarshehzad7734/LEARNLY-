import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader } from 'lucide-react'
import { authAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import { initGoogleAuth, renderGoogleButton } from '../../utils/googleAuth'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { role: routeRole } = useParams()
  const [role, setRole] = useState(routeRole || 'student')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [keepSignedIn, setKeepSignedIn] = useState(false)

  const { setAuth, user, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && token) {
      navigate(`/${user.role}`)
    }
    if (routeRole && ['student', 'teacher', 'admin'].includes(routeRole)) {
      setRole(routeRole)
    }
  }, [user, token, navigate, routeRole])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login({ email, password })

      if (response.data.user.role !== role) {
        setError(`Invalid credentials for ${role} role. Please select the correct role.`)
        setLoading(false)
        return
      }

      setAuth(response.data)
      navigate(`/${response.data.user.role}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const setupGoogle = async () => {
      await initGoogleAuth()
      renderGoogleButton('google-login-button', async (credential) => {
        setLoading(true)
        setError('')
        try {
          const response = await authAPI.googleAuth(credential)
          
          if (response.data.user.role !== role) {
             setError(`Invalid role for this account. Please login as ${response.data.user.role}.`)
             setLoading(false)
             return
          }
          
          setAuth(response.data)
          navigate(`/${response.data.user.role}`)
        } catch (err) {
          setError(err.response?.data?.detail || 'Google login failed')
        } finally {
          setLoading(false)
        }
      })
    }
    setupGoogle()
  }, [role, navigate, setAuth])

  const handleGoogleClick = () => {
    // This is now handled by the Google button itself
  }

  const roleLabels = { student: 'Student', teacher: 'Faculty', admin: 'Administrator' }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Photo Background */}
      <div className="hidden lg:block lg:w-[48%] relative">
        <img
          src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80"
          alt="Person working on laptop"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[52%] flex flex-col min-h-screen bg-white">
        <div className="flex-1 flex items-center justify-center px-6 md:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[440px]"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-[42px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                Welcome Back
              </h1>
              <p className="text-sm text-[#14BF96] font-medium">
                Welcome back. Enter your credentials to access your account
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-lg mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                  placeholder="hello@example.cl"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-semibold text-slate-700 hover:text-[#14BF96] transition-colors"
                  >
                    Forgot Password
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                    placeholder="••••••••••••••"
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
                {error && error.includes('password') && (
                  <p className="text-xs text-red-500 mt-1">Please enter correct password</p>
                )}
              </div>

              {/* Keep me signed in */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-[#14BF96] focus:ring-[#14BF96]/20 cursor-pointer accent-[#0B4D3B]"
                />
                <label htmlFor="keepSignedIn" className="text-sm text-slate-600 font-medium cursor-pointer">
                  Keep me signed in
                </label>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full bg-[#0B4D3B] hover:bg-[#093D2F] text-white font-semibold text-sm transition-all disabled:opacity-60 shadow-lg shadow-[#0B4D3B]/20"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Continue'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-slate-400 font-medium">or sign up with</span>
              </div>
            </div>

            {/* Social Buttons */}
            <div className="flex flex-col gap-3">
              <div id="google-login-button" className="w-full min-h-[44px] flex justify-center"></div>
              
              {/* Other social options can be added here in the future */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGoogleClick}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>
              </div>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-slate-500 mt-8 font-medium">
              Don't have an Account?{' '}
              <Link
                to={routeRole ? `/signup/${routeRole}` : "/signup"}
                className="text-slate-900 font-bold hover:text-[#14BF96] transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Bottom Role Links */}
        <div className="py-4 text-center border-t border-slate-100">
          <span className="text-xs text-slate-400">Sign in as </span>
          {['teacher', 'admin', 'student'].map((r, i) => (
            <span key={r}>
              <Link
                to={`/login/${r}`}
                className={`text-xs font-semibold transition-colors ${role === r ? 'text-[#14BF96]' : 'text-[#14BF96] hover:text-[#0FA080]'}`}
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

export default Login
