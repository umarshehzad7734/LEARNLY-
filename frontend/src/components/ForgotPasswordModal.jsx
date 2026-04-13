import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Loader, CheckCircle } from 'lucide-react'
import { useState } from 'react'

const ForgotPasswordModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('')
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        // Simulate API call (no backend yet)
        setTimeout(() => {
            setLoading(false)
            setIsSubmitted(true)

            // Close modal after 3 seconds
            setTimeout(() => {
                onClose()
                setIsSubmitted(false)
                setEmail('')
            }, 3000)
        }, 1500)
    }

    const handleClose = () => {
        onClose()
        setIsSubmitted(false)
        setEmail('')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2rem] shadow-2xl p-8 md:p-10 max-w-md w-full relative"
                        >
                            {/* Close Button */}
                            <button
                                onClick={handleClose}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {!isSubmitted ? (
                                <>
                                    {/* Header */}
                                    <div className="mb-8">
                                        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
                                            <Mail className="w-7 h-7 text-[#14BF96]" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                                            Reset Password
                                        </h2>
                                        <p className="text-sm text-slate-600 font-medium">
                                            Enter your email address and we'll send you a link to reset your password.
                                        </p>
                                    </div>

                                    {/* Form */}
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Email Address
                                            </label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="input pl-11 py-3"
                                                    placeholder="name@example.com"
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="btn-premium w-full"
                                        >
                                            {loading ? (
                                                <Loader className="w-5 h-5 animate-spin mx-auto" />
                                            ) : (
                                                <span>Send Reset Link</span>
                                            )}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-8"
                                >
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Check Your Email</h3>
                                    <p className="text-sm text-slate-600 font-medium max-w-sm mx-auto">
                                        We've sent a password reset link to <span className="font-bold text-slate-900">{email}</span>
                                    </p>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

export default ForgotPasswordModal
