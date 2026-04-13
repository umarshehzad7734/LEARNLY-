import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { motion } from 'framer-motion'
import { GraduationCap, BookOpen, ShieldCheck, ArrowRight, TrendingUp } from 'lucide-react'

const RoleSelection = () => {
    const navigate = useNavigate()
    const logout = useAuthStore((state) => state.logout)

    // Clear any stale state when landing here
    useEffect(() => {
        logout()
    }, [logout])

    const roles = [
        {
            id: 'student',
            title: 'Student',
            description: 'Access courses, quizzes, and track your learning progress.',
            icon: GraduationCap,
            color: 'bg-[#14BF96] text-white',
            border: 'border-[#14BF96]',
            hover: 'hover:shadow-[#14BF96]/20'
        },
        {
            id: 'teacher',
            title: 'Teacher',
            description: 'Manage courses, monitor student performance, and create content.',
            icon: BookOpen,
            color: 'bg-indigo-600 text-white',
            border: 'border-indigo-600',
            hover: 'hover:shadow-indigo-600/20'
        },
        {
            id: 'admin',
            title: 'Administrator',
            description: 'System oversight, user management, and platform analytics.',
            icon: ShieldCheck,
            color: 'bg-slate-800 text-white',
            border: 'border-slate-800',
            hover: 'hover:shadow-slate-800/20'
        }
    ]

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-pattern-dots"></div>

            {/* Animated Blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-[#14BF96] rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-5xl z-10">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#14BF96] rounded-2xl shadow-lg mb-6 shadow-teal-500/20">
                            <span className="text-white font-black text-3xl">L</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                            Welcome to Learnly
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">
                            Choose your portal to continue your journey with our advanced AI-learning platform.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                    {roles.map((role, idx) => (
                        <motion.button
                            key={role.id}
                            onClick={() => navigate(`/login/${role.id}`)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 + 0.3 }}
                            whileHover={{ y: -8 }}
                            className={`group relative bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl ${role.hover} hover:shadow-2xl transition-all duration-300 text-left`}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${role.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <role.icon className="w-7 h-7" />
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-[#14BF96] transition-colors">
                                {role.title}
                            </h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                {role.description}
                            </p>

                            <div className="space-y-3 relative z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/login/${role.id}`) }}
                                    className={`w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 ${role.id === 'student' ? 'bg-[#14BF96] text-white shadow-lg shadow-teal-500/20 hover:bg-[#0FA080]' : role.id === 'teacher' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700' : 'bg-slate-800 text-white shadow-lg shadow-slate-500/20 hover:bg-slate-900'}`}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Sign In</span>
                                </button>

                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/signup/${role.id}`) }}
                                    className="w-full py-3.5 rounded-xl font-black uppercase tracking-wider text-[11px] border-2 border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <ArrowRight className="w-4 h-4" />
                                    <span>Create Account</span>
                                </button>
                            </div>

                            {/* Hover styling accent */}
                            <div className={`absolute bottom-0 left-0 w-full h-1.5 ${role.color.split(' ')[0]} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                        </motion.button>
                    ))}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-center text-slate-400 text-sm mt-16 font-medium"
                >
                    Don't have an account? <span onClick={() => navigate('/signup')} className="text-[#14BF96] cursor-pointer hover:underline font-bold">Create one today</span>
                </motion.p>
            </div>
        </div>
    )
}

export default RoleSelection
