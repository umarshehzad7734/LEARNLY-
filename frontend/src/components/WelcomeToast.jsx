import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'

const WelcomeToast = ({ fullName, role }) => {
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Check if already shown this session for this specific role
        const storageKey = `welcomeShown_${role}`
        const shown = sessionStorage.getItem(storageKey)
        if (!shown) {
            setShow(true)
            sessionStorage.setItem(storageKey, 'true')

            // Auto-dismiss after 5 seconds
            const timer = setTimeout(() => setShow(false), 5000)
            return () => clearTimeout(timer)
        }
    }, [])

    if (!show) return null

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-4 pr-12 flex items-center gap-3 min-w-[320px]">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#14BF96] flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="font-bold text-slate-900">Welcome back, {fullName}!</p>
                    <p className="text-xs text-slate-500 capitalize">{role} Dashboard</p>
                </div>
                <button
                    onClick={() => setShow(false)}
                    className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            </div>
        </div>
    )
}

export default WelcomeToast
