import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader, AlertTriangle, FileText, Plus, MessageSquare, Trash2, Menu, X, Zap } from 'lucide-react'
import { coursesAPI, ragAPI } from '../utils/api'

const ChatInterface = ({ courseId, onSendMessage, isLoading }) => {
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [input, setInput] = useState('')
  const [materials, setMaterials] = useState([])
  const [selectedMaterialId, setSelectedMaterialId] = useState('all')
  const modelProvider = 'groq' // Fixed to Groq only
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true) // For responsive toggle
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!courseId) return
      try {
        const res = await ragAPI.getSessions(courseId)
        setSessions(res.data)
        // Select most recent session if exists
        if (res.data.length > 0) {
          setCurrentSessionId(res.data[0].id)
        }
      } catch (error) {
        console.error('Failed to load sessions:', error)
      }
    }
    loadSessions()
  }, [courseId])

  // Load messages when session changes
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (!currentSessionId) {
        setMessages([])
        return
      }

      setIsLoadingHistory(true)
      try {
        const response = await ragAPI.getSessionHistory(currentSessionId)
        const historyMessages = response.data.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
          confidence: msg.confidence,
          timestamp: msg.created_at,
          moderation_warnings: [] // Backend response might not include this in history schema yet
        }))
        setMessages(historyMessages)
      } catch (error) {
        console.error('Failed to load session history:', error)
        setMessages([])
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadSessionMessages()
  }, [currentSessionId])

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const res = await coursesAPI.getById(courseId)
        const mats = res.data?.materials || []
        const indexed = mats.filter(m => m.vector_store_id && m.status === 'completed')
        setMaterials(indexed)
      } catch (e) {
        setMaterials([])
      }
    }

    if (courseId) loadMaterials()
  }, [courseId])

  const handleNewChat = () => {
    setCurrentSessionId(null)
    setMessages([])
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this chat?')) return

    try {
      await ragAPI.deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput('')

    try {
      const materialIds = selectedMaterialId === 'all' ? undefined : [selectedMaterialId]
      const historyPayload = nextMessages
        .filter(m => m && (m.role === 'user' || m.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }))

      // Pass currentSessionId and modelProvider
      const response = await onSendMessage(input, historyPayload, materialIds, currentSessionId, modelProvider)

      // If we just started a new session, update state
      if (!currentSessionId && response.session_id) {
        setCurrentSessionId(response.session_id)
        // Also fetch sessions again to show the new one in sidebar
        const sessionsRes = await ragAPI.getSessions(courseId)
        setSessions(sessionsRes.data)
      }

      const aiMessage = {
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
        moderation_passed: response.moderation_passed,
        moderation_warnings: response.moderation_warnings,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      const errorMessage = {
        role: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[700px] bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-premium relative">

      {/* Mobile Menu Toggle */}
      <button
        className="lg:hidden absolute top-4 left-4 z-20 p-2 bg-white rounded-lg shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 absolute lg:relative z-10 w-64 h-full bg-slate-50 border-r border-slate-200 transition-transform duration-300 flex flex-col`}>
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#14BF96] hover:bg-[#0FA080] text-white py-3 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          <div className="px-2 mb-4">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">AI Model</label>
            <div className="flex bg-slate-100 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Zap className="w-3 h-3 text-[#14BF96]" />
                <span>Groq (Cloud)</span>
              </div>
            </div>
          </div>

          {sessions.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-10">
              No history yet
            </div>
          )}
          {sessions.map(session => (
            <div
              key={session.id}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-white shadow-sm border border-slate-200' : 'hover:bg-slate-100'}`}
              onClick={() => {
                setCurrentSessionId(session.id)
                if (window.innerWidth < 1024) setIsSidebarOpen(false)
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === session.id ? 'text-[#14BF96]' : 'text-slate-400'}`} />
                <span className={`text-sm truncate ${currentSessionId === session.id ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                  {session.title}
                </span>
              </div>
              <button
                onClick={(e) => handleDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-teal-50 hover:text-teal-600 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full h-full relative">

        {/* Chat Header */}
        <div className="p-6 border-b border-slate-100 bg-white relative pl-16 lg:pl-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-2xl -mr-16 -mt-16"></div>
          <div className="relative z-0 flex justify-between items-start">
            <div className="flex flex-col">
              <h3 className="text-lg font-black flex items-center gap-3 text-slate-900 tracking-tight">
                <div className="p-2.5 bg-[#14BF96] rounded-xl shadow-red-200 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span>AI Co-Instructor</span>
              </h3>
              <p className="text-sm font-medium text-slate-500 mt-2 ml-12">
                Professional guidance through your curriculum
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Focus:
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/10 focus:border-[#14BF96] transition-all max-w-[150px]"
                >
                  <option value="all">All Lectures</option>
                  {materials.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 relative">
          {isLoadingHistory && (
            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-[#14BF96]" />
            </div>
          )}

          <AnimatePresence>
            {messages.length === 0 && !isLoadingHistory && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-gray-400 mt-20"
              >
                <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Start a new conversation</p>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 transition-all duration-200 ${message.role === 'user'
                    ? 'bg-[#14BF96] text-white shadow-lg shadow-red-100'
                    : message.role === 'error'
                      ? 'bg-teal-50 text-teal-800 border border-teal-100 shadow-sm'
                      : 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                    }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                    {message.role === 'user' && <User className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                    {message.role === 'error' && <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>

                      {/* Moderation Warnings */}
                      {message.moderation_warnings && message.moderation_warnings.length > 0 && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Content warning: {message.moderation_warnings.join(', ')}
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-semibold mb-2 flex items-center text-gray-700">
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Sources ({message.sources.length}):
                          </p>
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs bg-gradient-to-br from-gray-50 to-slate-50 p-3 rounded-lg mb-2 border border-gray-100 shadow-sm">
                              <div className="flex items-start justify-between mb-1.5">
                                <p className="font-semibold text-gray-800 flex-1">{source.metadata.material}</p>
                                <span className="px-2 py-0.5 bg-red-100 text-[#0FA080] rounded-full text-[10px] font-medium ml-2">
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-gray-600 line-clamp-2 mt-1 leading-relaxed">{source.content}</p>
                              {source.metadata.strategy && (
                                <p className="text-gray-400 mt-2 text-[10px] flex items-center gap-1">
                                  <span className="inline-block w-1 h-1 rounded-full bg-[#14BF96]"></span>
                                  Chunking: {source.metadata.strategy}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200">
                  <Loader className="w-5 h-5 animate-spin text-[#14BF96]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-slate-100 bg-white">
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14BF96]/10 focus:border-[#14BF96] transition-all duration-200 resize-none min-h-[56px] max-h-[120px]"
                rows="1"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="btn-primary w-14 h-14 rounded-2xl p-0 flex items-center justify-center shadow-lg shadow-red-100"
            >
              {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface
