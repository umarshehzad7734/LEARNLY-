import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users as UsersIcon, Search, UserCheck, UserX, Trash2, Edit2, Filter, BarChart3, BookOpen, Shield, TrendingUp, Calendar, ArrowUpDown, Building2 } from 'lucide-react'
import Layout from '../../components/Layout'
import { usersAPI } from '../../utils/api'
import { useAuthStore } from '../../store/authStore'

// Color palette for avatars
const avatarColors = [
  'bg-purple-200 text-purple-700',
  'bg-amber-200 text-amber-700',
  'bg-pink-200 text-pink-700',
  'bg-emerald-200 text-emerald-700',
  'bg-blue-200 text-blue-700',
  'bg-indigo-200 text-indigo-700',
  'bg-rose-200 text-rose-700',
  'bg-teal-200 text-teal-700',
]

const Users = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const { user: currentUser } = useAuthStore()

  const sidebarItems = [
    { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
    { label: 'Directory', path: '/admin/users', icon: UsersIcon },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Governance', path: '/admin/moderation', icon: Shield },
    { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ]

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, roleFilter, users])

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll()
      setUsers(response.data)
      setFilteredUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        user =>
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const handleActivate = async (userId) => {
    try {
      await usersAPI.activate(userId)
      await fetchUsers()
      alert('User activated successfully!')
    } catch (error) {
      console.error('Failed to activate user:', error)
      alert('Failed to activate user: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDeactivate = async (userId) => {
    if (currentUser?.id === userId) {
      alert('Security Alert: You cannot deactivate your own administrative account.')
      return
    }

    try {
      await usersAPI.deactivate(userId)
      await fetchUsers()
      alert('User deactivated successfully!')
    } catch (error) {
      console.error('Failed to deactivate user:', error)
      alert('Failed to deactivate user: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
      return
    }

    try {
      await usersAPI.delete(userId)
      await fetchUsers()
      alert('User deleted successfully!')
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('Failed to delete user: ' + (error.response?.data?.detail || error.message))
    }
  }

  // Date range
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  const formatDate = (d) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`
  const dateRange = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-blue-600'
      case 'teacher': return 'text-pink-600'
      case 'student': return 'text-emerald-600'
      default: return 'text-slate-600'
    }
  }

  const roleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'teacher': return 'Teacher'
      case 'student': return 'Students'
      default: return role
    }
  }

  return (
    <Layout sidebarItems={sidebarItems} title="User Directory">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">User Directory</h1>
          <p className="text-sm text-slate-500">
            Today you have {users.length} users, <span className="underline cursor-pointer font-medium">View Details</span>
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{dateRange}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900">Total Users</h3>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">{users.length}+</span>
            <div className="relative ml-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Type to search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] w-[200px]"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort By
            </button>
            <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer"
              >
                <option value="all">Filter</option>
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 w-8">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500">Name</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500">Email address</th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">Status <svg className="w-3 h-3" viewBox="0 0 12 12"><path d="M6 9L2 5h8L6 9z" fill="currentColor" /></svg></span>
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">Role <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" /><text x="10" y="14" textAnchor="middle" className="text-[10px]" fill="currentColor">i</text></svg></span>
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-3.5">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColors[index % avatarColors.length]}`}>
                        {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
                        <p className="text-xs text-slate-400">@{user.full_name.split(' ')[0].toLowerCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-600">{user.email}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                      <span className={`text-sm font-medium ${roleColor(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-slate-600">{user.is_active ? 'Authorized' : 'Suspended'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(user.id) }}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          user.is_active ? handleDeactivate(user.id) : handleActivate(user.id)
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#14BF96] transition-colors"
                        title={user.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found matching your criteria
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Users
