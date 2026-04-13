import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader, Plus, MessageSquare, PanelLeftClose, PanelLeft, MoreHorizontal, Sparkles, Search, Library, ChevronDown, Check, X, Zap, Cpu } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ragAPI, coursesAPI } from '../../utils/api'

const AIChat = () => {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [materials, setMaterials] = useState([])
  const [selectedMaterials, setSelectedMaterials] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const modelProvider = 'groq' // Fixed to Groq only

  const dropdownRef = useRef(null)
  const modelDropdownRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMaterialDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        setShowModelDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(historySearch.toLowerCase())
  )

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchInitialData()
  }, [courseId])

  const fetchInitialData = async () => {
    try {
      // Fetch course materials
      const courseRes = await coursesAPI.getById(courseId)
      setMaterials(courseRes.data.materials || [])

      // Fetch sessions
      const sessionsRes = await ragAPI.getSessions(courseId)
      setSessions(sessionsRes.data || [])

      if (sessionsRes.data && sessionsRes.data.length > 0) {
        handleSelectSession(sessionsRes.data[0].id)
      } else {
        startNewChat()
      }
    } catch (error) {
      console.error('Error fetching initial chat data:', error)
    }
  }

  const handleSelectSession = async (sessionId) => {
    setCurrentSessionId(sessionId)
    setFetchingHistory(true)
    try {
      const historyRes = await ragAPI.getSessionHistory(sessionId)
      setMessages(historyRes.data.messages || [])
    } catch (error) {
      console.error('Error fetching session history:', error)
    } finally {
      setFetchingHistory(false)
    }
  }

  const startNewChat = () => {
    setCurrentSessionId(null)
    setMessages([
      {
        role: 'assistant',
        content: "Hi there! I'm your Learnly AI Assistant. I can help you understand course materials, practice for quizzes, or explain complex topics. What are you working on?"
      }
    ])
  }

  const toggleMaterial = (id) => {
    setSelectedMaterials(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const queryText = input
    setInput('')
    setLoading(true)

    try {
      const response = await ragAPI.chat(
        courseId,
        queryText,
        currentSessionId,
        selectedMaterials.length > 0 ? selectedMaterials : null,
        modelProvider
      )

      if (!currentSessionId && response.data.session_id) {
        setCurrentSessionId(response.data.session_id)
        // Refresh sessions list
        const sessionsRes = await ragAPI.getSessions(courseId)
        setSessions(sessionsRes.data || [])
      }

      const aiMessage = {
        role: 'assistant',
        content: response.data.answer || "I've processed your request."
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again."
      }])
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] bg-white overflow-hidden rounded-[2rem] shadow-2xl border border-slate-200 ml-4 mb-4 mr-4">
      {/* Sidebar - ChatGPT Style */}
      <AnimatePresence mode='wait'>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-[#0B2149] text-slate-300 flex flex-col border-r border-white/10 relative z-20"
          >
            {/* New Chat Button */}
            <div className="p-4">
              <button
                onClick={startNewChat}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition-colors text-white text-sm font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New chat</span>
              </button>
            </div>

            {/* Search History */}
            <div className="px-4 pb-2 pt-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-[#14BF96] transition-colors" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#14BF96]/50 focus:bg-white/10 transition-all font-medium"
                />
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 pt-2">
              <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">History</div>
              {filteredSessions.length === 0 ? (
                <div className="text-xs text-slate-600 px-4 mt-2 italic">
                  {historySearch ? 'No matches found' : 'No previous conversations'}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left group ${currentSessionId === s.id ? 'bg-white/15 text-white shadow-sm' : 'hover:bg-white/10 text-slate-400'}`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${currentSessionId === s.id ? 'text-[#14BF96]' : ''}`} />
                      <span className="text-sm truncate flex-1 font-medium">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 w-full px-3 py-3">
                <div className="w-8 h-8 rounded-full bg-[#14BF96] flex items-center justify-center text-white font-bold text-xs">
                  S
                </div>
                <div className="text-sm font-medium text-white">Student Account</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-slate-100/50 bg-white/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 transition-all">
          {/* Left Side: Toggle + Title */}
          <div className="flex items-center gap-2 overflow-hidden mr-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors shrink-0"
            >
              {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            <div className="min-w-0">
              <span className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                <span className="text-[#14BF96] hidden md:inline">Learnly</span>
                <span className="text-slate-900 font-black truncate">AI Assistant</span>
              </span>
            </div>
          </div>

          {/* Right Side: Selectors */}
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {/* Model Indicator (Fixed to Groq) */}
            <div className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600">
              <Zap className="w-3.5 h-3.5 md:w-4 h-4" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline">
                Groq (Cloud)
              </span>
            </div>

            {/* Material Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
                className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-xl transition-all border ${selectedMaterials.length > 0
                  ? 'bg-teal-50 border-teal-200 text-[#14BF96]'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
              >
                <Library className="w-3.5 h-3.5 md:w-4 h-4" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden sm:inline">
                  {selectedMaterials.length === 0
                    ? 'All Sources'
                    : `${selectedMaterials.length} Doc${selectedMaterials.length === 1 ? '' : 's'}`}
                </span>
                <ChevronDown className={`w-3 h-3 md:w-3.5 h-3.5 transition-transform duration-200 ${showMaterialDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showMaterialDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 ring-4 ring-slate-900/5"
                  >
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Base</span>
                        {selectedMaterials.length > 0 && (
                          <button
                            onClick={() => setSelectedMaterials([])}
                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Select Focus Materials</h4>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
                      {materials.length === 0 ? (
                        <div className="py-8 text-center px-4">
                          <Library className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-medium">No materials shared in this course yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {materials.map(m => (
                            <button
                              key={m.id}
                              onClick={() => toggleMaterial(m.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${selectedMaterials.includes(m.id)
                                ? 'bg-teal-50 text-[#14BF96]'
                                : 'hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                              <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all ${selectedMaterials.includes(m.id)
                                ? 'bg-[#14BF96] border-[#14BF96] text-white'
                                : 'bg-white border-slate-200 group-hover:border-slate-300'
                                }`}>
                                {selectedMaterials.includes(m.id) && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-bold truncate ${selectedMaterials.includes(m.id) ? 'text-[#14BF96]' : 'text-slate-700'}`}>
                                  {m.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium uppercase">{m.file_type || 'PDF'}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedMaterials.length > 0 && (
                      <div className="p-3 bg-[#14BF96]/5 border-t border-teal-100">
                        <p className="text-[10px] text-[#14BF96] font-bold text-center leading-tight">
                          AI will prioritize the selected {selectedMaterials.length} docs in its response.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pt-20 pb-40">
          <div className="max-w-3xl mx-auto px-4 space-y-8">
            {fetchingHistory && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader className="w-8 h-8 text-[#14BF96] animate-spin" />
                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Retrieving Log...</span>
              </div>
            )}
            {!fetchingHistory && messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 md:gap-6 group ${msg.role === 'assistant' ? 'bg-slate-50/50 -mx-4 px-4 py-8 rounded-3xl' : ''}`}>
                <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-[#14BF96] to-[#0FA080] text-white shadow-lg shadow-teal-500/20'
                  : 'bg-white border border-slate-200 text-slate-600 shadow-sm'
                  }`}>
                  {msg.role === 'assistant' ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="font-black text-xs uppercase tracking-widest text-slate-900">
                      {msg.role === 'assistant' ? 'Assistant' : 'You'}
                    </div>
                    {msg.role === 'assistant' && selectedMaterials.length > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-100 text-[#14BF96] text-[9px] font-black rounded-full uppercase tracking-tighter shadow-sm border border-teal-200">
                        <Library className="w-2.5 h-2.5" /> Checked {selectedMaterials.length} Sources
                      </div>
                    )}
                  </div>
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm md:text-base font-medium prose-p:leading-relaxed prose-li:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 md:gap-6 bg-slate-50/50 -mx-4 px-4 py-8 rounded-3xl">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#14BF96] to-[#0FA080] flex items-center justify-center text-white animate-bounce shadow-lg shadow-teal-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3 pt-2">
                  <div className="w-1/4 h-2 bg-slate-200 rounded-full animate-pulse" />
                  <div className="w-3/4 h-2 bg-slate-100 rounded-full animate-pulse" />
                  <div className="w-1/2 h-2 bg-slate-50 rounded-full animate-pulse" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-8 px-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend} className="relative shadow-2xl shadow-slate-200/50 rounded-3xl bg-white border border-slate-200 focus-within:border-[#14BF96]/50 focus-within:ring-4 focus-within:ring-[#14BF96]/5 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your AI tutor..."
                className="w-full px-6 py-4 pr-16 bg-transparent border-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-[15px]"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#14BF96] text-white rounded-xl shadow-lg shadow-teal-600/20 hover:bg-[#0FA080] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="text-center mt-3 text-xs text-slate-400 font-medium tracking-tight">
              Assistant can make mistakes. Please verify important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIChat
