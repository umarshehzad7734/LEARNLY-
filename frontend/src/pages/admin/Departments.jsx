import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Plus, X, Trash2, BarChart3, Users, Shield, TrendingUp, BookOpen, Palette } from 'lucide-react'
import Layout from '../../components/Layout'
import { departmentsAPI } from '../../utils/api'

const PRESET_COLORS = [
    '#4F46E5', '#F59E0B', '#14BF96', '#EC4899', '#8B5CF6',
    '#06B6D4', '#EF4444', '#0EA5E9', '#D946EF', '#F97316',
    '#10B981', '#6366F1', '#E11D48', '#0891B2', '#A855F7'
]

const Departments = () => {
    const [departments, setDepartments] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({ name: '', color: '#4F46E5', total_semesters: 8 })
    const [error, setError] = useState('')

    const sidebarItems = [
        { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
        { label: 'Directory', path: '/admin/users', icon: Users },
        { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
        { label: 'Governance', path: '/admin/moderation', icon: Shield },
        { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
        { label: 'Departments', path: '/admin/departments', icon: Building2 },
    ]

    useEffect(() => {
        fetchDepartments()
    }, [])

    const fetchDepartments = async () => {
        try {
            const response = await departmentsAPI.getAll()
            setDepartments(response.data)
        } catch (err) {
            console.error('Failed to fetch departments:', err)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!formData.name.trim()) {
            setError('Department name is required')
            return
        }
        try {
            await departmentsAPI.create(formData)
            fetchDepartments()
            setShowModal(false)
            setFormData({ name: '', color: '#4F46E5', total_semesters: 8 })
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to create department')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return
        try {
            await departmentsAPI.delete(id)
            fetchDepartments()
        } catch (err) {
            console.error('Failed to delete department:', err)
        }
    }

    return (
        <Layout sidebarItems={sidebarItems} title="Department Management">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">Departments</h1>
                    <p className="text-sm text-slate-500">{departments.length} departments configured</p>
                </div>
                <button
                    onClick={() => { setFormData({ name: '', color: '#4F46E5', total_semesters: 8 }); setError(''); setShowModal(true) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Add Department
                </button>
            </div>

            {/* Departments Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                {departments.map((dept, index) => (
                    <motion.div
                        key={dept.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-all group relative"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: dept.color + '20' }}
                            >
                                <Building2 className="w-5 h-5" style={{ color: dept.color }} />
                            </div>
                            <button
                                onClick={() => handleDelete(dept.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2">{dept.name}</h3>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-4 h-4 rounded-full border border-slate-200"
                                style={{ backgroundColor: dept.color }}
                            />
                            <span className="text-xs text-slate-400 font-mono">{dept.color}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-500 font-medium">
                            {dept.total_semesters} Semesters
                        </div>
                    </motion.div>
                ))}
            </div>

            {departments.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-lg font-medium">No departments yet</p>
                    <p className="text-sm mt-1">Create departments to organize students and courses</p>
                </div>
            )}

            {/* Create Modal */}
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
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900">New Department</h3>
                                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {error && (
                                    <div className="bg-red-50 text-red-600 border border-red-100 px-4 py-3 rounded-lg text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96]"
                                        placeholder="e.g. BS Computer Science"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Semesters</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formData.total_semesters}
                                        onChange={(e) => setFormData({ ...formData, total_semesters: parseInt(e.target.value) })}
                                        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#14BF96]/20 focus:border-[#14BF96]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        <span className="flex items-center gap-1.5"><Palette className="w-4 h-4" /> Chart Color</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-8 h-8 rounded-lg border-2 transition-all ${formData.color === color ? 'border-slate-900 scale-110' : 'border-transparent hover:border-slate-300'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                                        />
                                        <span className="text-sm text-slate-500 font-mono">{formData.color}</span>
                                    </div>
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
                                        Create Department
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

export default Departments
