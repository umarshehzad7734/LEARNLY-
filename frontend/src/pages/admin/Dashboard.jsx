import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, BookOpen, BarChart3, Shield, TrendingUp, Calendar, Eye, Settings, Building2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import Layout from '../../components/Layout'
import { usersAPI, analyticsAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'

const AdminDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    activeUsers: 0,
    avgScore: 0,
    totalStudents: 0
  })
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const sidebarItems = [
    { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
    { label: 'Directory', path: '/admin/users', icon: Users },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Governance', path: '/admin/moderation', icon: Shield },
    { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [userStats, systemAnalytics] = await Promise.all([
        usersAPI.getStats(),
        analyticsAPI.getSystemAnalytics()
      ])

      setStats({
        users: userStats.data.total_users,
        courses: systemAnalytics.data.total_courses,
        activeUsers: userStats.data.active_users,
        avgScore: systemAnalytics.data.average_platform_score,
        totalStudents: userStats.data.students || 0
      })

      setAnalytics(systemAnalytics.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Mini sparkline data
  const sparklines = {
    users: [20, 35, 28, 42, 38, 55, 48],
    courses: [40, 35, 45, 30, 38, 25, 30],
    active: [30, 28, 35, 40, 32, 45, 50],
    score: [60, 65, 58, 70, 68, 75, 80]
  }

  const statCards = [
    { title: 'Total Users', value: stats.users, trend: '+20%', trendUp: true, color: '#4F46E5', bgColor: '#EEF2FF', sparkData: sparklines.users, sparkColor: '#4F46E5' },
    { title: 'Total Courses', value: stats.courses, trend: '-15%', trendUp: false, color: '#EC4899', bgColor: '#FDF2F8', sparkData: sparklines.courses, sparkColor: '#EC4899' },
    { title: 'Active Users', value: stats.activeUsers, trend: '+18%', trendUp: true, color: '#14BF96', bgColor: '#ECFDF5', sparkData: sparklines.active, sparkColor: '#14BF96' },
    { title: 'Avg Score', value: `${stats.avgScore.toFixed(0)}%`, trend: '+12%', trendUp: true, color: '#F59E0B', bgColor: '#FFFBEB', sparkData: sparklines.score, sparkColor: '#F59E0B' },
  ]

  // Donut chart data - from backend enrollment_by_department (students per department)
  const departmentColors = analytics?.department_colors || {}
  const fallbackColors = ['#4F46E5', '#F59E0B', '#14BF96', '#EC4899', '#EF4444', '#8B5CF6', '#06B6D4', '#0EA5E9', '#D946EF', '#F97316']
  let colorIdx = 0
  const donutData = analytics?.enrollment_by_department
    ? Object.entries(analytics.enrollment_by_department).map(([name, value]) => ({
      name,
      value,
      color: departmentColors[name] || fallbackColors[colorIdx++ % fallbackColors.length]
    })).filter(d => d.value > 0)
    : []
  // Fallback if no enrollment data
  if (donutData.length === 0) {
    donutData.push({ name: 'No Enrollments', value: 1, color: '#e2e8f0' })
  }
  const totalStudents = stats.totalStudents

  // Today's date range
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const formatDate = (d) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
  const dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`

  return (
    <Layout sidebarItems={sidebarItems} title="Admin Dashboard">
      {/* Welcome Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome, {user?.full_name?.split(' ')[0] || 'Admin'}</h1>
          <p className="text-sm text-slate-500">
            Today you have 10 visits, <span className="underline cursor-pointer font-medium">View Details</span>
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{dateRange}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: stat.bgColor }}>
                  <Users className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{stat.title}</p>
                  <h3 className="text-xl font-bold text-slate-900">{stat.value}</h3>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stat.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                {stat.trend}
              </span>
            </div>
            {/* Mini Sparkline */}
            <div className="h-10 mt-1">
              <svg viewBox="0 0 120 30" className="w-full h-full">
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stat.sparkColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={stat.sparkColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,${30 - stat.sparkData[0] * 0.5} ${stat.sparkData.map((v, i) => `L${(i / 6) * 120},${30 - v * 0.5}`).join(' ')} L120,30 L0,30 Z`}
                  fill={`url(#gradient-${index})`}
                />
                <polyline
                  points={stat.sparkData.map((v, i) => `${(i / 6) * 120},${30 - v * 0.5}`).join(' ')}
                  fill="none"
                  stroke={stat.sparkColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        {/* Demographic Velocity - Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Demographic Velocity</h3>
              <p className="text-xs text-slate-500 mt-0.5">Total No of Students : {stats.users}</p>
            </div>
            <button className="text-sm text-slate-500 font-medium hover:text-[#14BF96] transition-colors">View All</button>
          </div>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4F46E5]"></span> New Students</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#93C5FD]"></span> Old Students</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.user_growth ? Object.entries(analytics.user_growth).map(([date, count]) => ({ date: date.slice(5), newS: count, oldS: Math.floor(count * 0.6) })) : [
                { date: '25 May', newS: 30, oldS: 18 },
                { date: '26 May', newS: 45, oldS: 25 },
                { date: '27 May', newS: 35, oldS: 20 },
                { date: '28 May', newS: 55, oldS: 30 },
                { date: '29 May', newS: 80, oldS: 45 },
                { date: '30 May', newS: 100, oldS: 55 },
                { date: '31 May', newS: 70, oldS: 40 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}
                />
                <Bar dataKey="newS" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={14} name="New Students" />
                <Bar dataKey="oldS" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={14} name="Old Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Curriculum Engagement - Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Curriculum Engagement</h3>
            <span className="text-xs text-slate-500 font-medium">All Departments</span>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-[180px] h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400">Students</span>
                <span className="text-2xl font-bold text-slate-900">{totalStudents}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
            {donutData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-100">
            <div>
              <p className="text-lg font-bold text-slate-900">{stats.courses}</p>
              <p className="text-[11px] text-slate-400">Total Courses</p>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{stats.activeUsers}+</p>
              <p className="text-[11px] text-slate-400">Active last month</p>
            </div>
          </div>
        </motion.div>

        {/* Security & Governance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-slate-200 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900">Security & Governance</h3>
            <button className="text-sm text-slate-500 font-medium hover:text-[#14BF96] transition-colors">View All</button>
          </div>

          {/* Radial gauge */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-[160px] h-[100px]">
              <svg viewBox="0 0 160 100" className="w-full h-full">
                {/* Background arc dots */}
                {Array.from({ length: 20 }).map((_, i) => {
                  const angle = Math.PI + (i / 19) * Math.PI
                  const x = 80 + 65 * Math.cos(angle)
                  const y = 90 + 65 * Math.sin(angle)
                  const passRate = analytics?.moderation?.pass_rate || 0.8
                  const filled = i / 19 <= passRate
                  return (
                    <circle key={i} cx={x} cy={y} r="3" fill={filled ? '#4F46E5' : '#E2E8F0'} />
                  )
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                <span className="text-xs text-slate-400">All Users</span>
                <span className="text-2xl font-bold text-slate-900">
                  {analytics?.moderation?.pass_rate ? `${(analytics.moderation.pass_rate * 100).toFixed(0)}%` : '80%'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs">👨</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Active</p>
                  <p className="text-[10px] text-slate-400">Since Last Week</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900">{stats.activeUsers > 0 ? Math.round(stats.activeUsers / stats.users * 100) : 69}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                  <span className="text-xs">👩</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600">Inactive</p>
                  <p className="text-[10px] text-slate-400">Since Last Week</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900">{stats.activeUsers > 0 ? 100 - Math.round(stats.activeUsers / stats.users * 100) : 31}%</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'Directory', path: '/admin/users', icon: Users, color: '#ECFDF5' },
          { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp, color: '#EEF2FF' },
          { label: 'Governance', path: '/admin/moderation', icon: Shield, color: '#FDF2F8' },
          { label: 'Curriculum', path: '/admin/courses', icon: BookOpen, color: '#F0FDF4' },
        ].map((card, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => navigate(card.path)}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all text-center group"
          >
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-colors" style={{ backgroundColor: card.color }}>
              <card.icon className="w-6 h-6 text-[#4F46E5] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{card.label}</p>
          </motion.button>
        ))}
      </div>
    </Layout>
  )
}

export default AdminDashboard
