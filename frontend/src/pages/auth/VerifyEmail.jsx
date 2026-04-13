import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Loader, ArrowLeft } from 'lucide-react'
import { authAPI } from '../../utils/api'

const VerifyEmail = () => {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')
    const [status, setStatus] = useState('verifying') // verifying, success, error
    const [message, setMessage] = useState('Verifying your email...')

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error')
                setMessage('Invalid verification link.')
                return
            }

            try {
                await authAPI.verifyEmail(token)
                setStatus('success')
                setMessage('Email verified successfully! You can now log in.')
            } catch (error) {
                setStatus('error')
                setMessage(error.response?.data?.detail || 'Verification failed. Link may be expired.')
            }
        }

        verify()
    }, [token])

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link to="/" className="flex justify-center mb-6">
                    <span className="text-2xl font-black text-[#14BF96]">Learnly</span>
                </Link>

                <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    Email Verification
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    {status === 'verifying' && (
                        <div className="flex flex-col items-center">
                            <Loader className="w-12 h-12 text-[#14BF96] animate-spin mb-4" />
                            <p className="text-gray-600">Verifying your email address...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Verified!</h3>
                            <p className="text-gray-600 mb-6">{message}</p>

                            <Link
                                to="/login"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#14BF96] hover:bg-[#11a682] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#14BF96]"
                            >
                                Continue to Login
                            </Link>
                        </motion.div>
                    )}

                    {status === 'error' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center"
                        >
                            <XCircle className="w-16 h-16 text-red-500 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h3>
                            <p className="text-gray-600 mb-6">{message}</p>

                            <Link
                                to="/login"
                                className="flex items-center text-[#14BF96] hover:text-[#11a682] font-medium"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Link>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default VerifyEmail
