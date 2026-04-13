import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, LogOut, User, Settings, Search, Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { notificationAPI } from '../utils/api'

const Layout = ({ children, sidebarItems, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [notifications, setNotifications] = useState([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [bannerNotice, setBannerNotice] = useState(null)

  useEffect(() => {
    if (user?.role === 'student') {
      fetchNotifications()
      const intervalId = setInterval(fetchNotifications, 10000)
      return () => clearInterval(intervalId)
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getMine()
      setNotifications(res.data)
      const unread = res.data.filter(n => !n.is_read)
      if (unread.length > 0) {
        setBannerNotice("A new quiz has been generated. You can attempt it now.")
      } else {
        setBannerNotice(null)
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err)
    }
  }

  const handleReadNotification = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationAPI.markRead(notif.id)
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      } catch (err) { console.error(err) }
    }
    if (notif.link) {
      navigate(notif.link)
      setShowNotifDropdown(false)
    }
  }

  const handleDismissBanner = async () => {
    setBannerNotice(null)
    try {
      await notificationAPI.markAllRead()
      fetchNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isExpanded = sidebarOpen

  // Determine header title based on role
  const headerTitle = user?.role === 'admin' ? 'Admin Overview' : user?.role === 'teacher' ? 'Teachers Overview' : title

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-slate-900 flex">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: isMobile ? -280 : 0 }}
        animate={{
          x: isMobile ? (sidebarOpen ? 0 : -300) : 0,
          width: isExpanded ? 240 : 72
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed top-0 left-0 h-full bg-[#0B2149] text-white z-40 shadow-xl overflow-hidden flex flex-col"
      >
        {/* Logo Section */}
        <div className="px-4 py-5 flex items-center gap-3 h-[68px] border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-[#14BF96] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-teal-900/20">
              <span className="font-black text-lg text-white">L</span>
            </div>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-black text-lg tracking-tight text-white whitespace-nowrap"
              >
                LEARNLY
              </motion.span>
            )}
          </Link>
          {isExpanded && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              title="Collapse"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {!isExpanded && !isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="ml-auto p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
              title="Expand"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${isActive
                  ? 'bg-[#14BF96] text-white shadow-lg shadow-teal-900/20'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                title={!isExpanded ? item.label : ''}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                {isExpanded && (
                  <span className="font-medium text-[13px] whitespace-nowrap overflow-hidden">{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Settings Link */}
        <div className="px-3 pb-2">
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${location.pathname === '/profile'
              ? 'bg-[#14BF96] text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
          >
            <Settings className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-white" />
            {isExpanded && (
              <span className="font-medium text-[13px]">Settings</span>
            )}
          </Link>
        </div>

        {/* User Profile Section */}
        <div className="p-3 border-t border-white/10 bg-[#081937]">
          <div className={`flex items-center gap-2.5 ${!isExpanded && 'justify-center'}`}>
            <div
              className="w-9 h-9 rounded-full bg-[#14BF96] flex items-center justify-center text-white font-bold text-sm border-2 border-[#1B3B6F] shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            {isExpanded && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                  <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 w-full ${isExpanded && !isMobile ? 'ml-[240px]' : 'ml-[72px]'}`}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 h-[68px]">
            {/* Left - Title */}
            <div className="flex items-center gap-3">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-[15px] font-semibold text-slate-700">{headerTitle}</h2>
            </div>

            {/* Center - Search Bar */}
            <div className="hidden md:flex items-center max-w-md flex-1 mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-16 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96] transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">⌘</kbd>
                  <kbd className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">F</kbd>
                </div>
              </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter(n => !n.is_read).length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                        <span className="text-xs font-semibold text-[#14BF96] bg-[#14BF96]/10 px-2 py-0.5 rounded-full">
                          {notifications.filter(n => !n.is_read).length} New
                        </span>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => handleReadNotification(notif)}
                              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!notif.is_read ? 'bg-[#14BF96]/5' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? 'bg-[#14BF96] text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  <Bell className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>{notif.title}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                  <span className="text-[10px] font-medium text-slate-400 mt-2 block">
                                    {new Date(notif.created_at).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No alerts</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/profile')}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14BF96] to-[#0FA080] flex items-center justify-center text-white text-xs font-bold">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">{user?.full_name?.split(' ')[0]}</span>
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 md:p-8 w-full">
          {user?.role === 'student' && bannerNotice && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 bg-gradient-to-r from-[#14BF96] to-teal-500 rounded-2xl p-4 flex items-center justify-between text-white shadow-premium"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <p className="font-bold tracking-wide">{bannerNotice}</p>
              </div>
              <button 
                onClick={handleDismissBanner} 
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
                title="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default Layout
