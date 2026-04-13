import { useState, useEffect } from 'react'
import { TrendingUp, BookOpen, Award, FileText, BarChart3, Layout as LayoutIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Layout from '../../components/Layout'
import { quizAPI, assignmentAPI } from '../../utils/api'

const StudentProgress = () => {
  const [attempts, setAttempts] = useState([])
  const [submissions, setSubmissions] = useState([])

  const sidebarItems = [
    { label: 'Dashboard', path: '/student', icon: LayoutIcon },
    { label: 'My Courses', path: '/student/courses', icon: BookOpen },
    { label: 'Progress', path: '/student/progress', icon: BarChart3 },
  ]

  useEffect(() => {
    fetchAttempts()
    fetchSubmissions()
  }, [])

  const fetchAttempts = async () => {
    try {
      const response = await quizAPI.getMyAttempts()
      setAttempts(response.data)
    } catch (error) {
      console.error('Failed to fetch attempts:', error)
    }
  }

  const fetchSubmissions = async () => {
    try {
      const response = await assignmentAPI.getMySubmissions()
      setSubmissions(response.data)
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
    }
  }

  const sortedAttempts = [...attempts].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))

  const chartData = sortedAttempts.map((attempt, index) => ({
    quiz: `Quiz ${index + 1}`,
    score: attempt.percentage
  }))

  const allAssessments = [
    ...attempts.map(a => ({ ...a, type: 'quiz', date: a.completed_at, score: a.percentage })),
    ...submissions.map(s => ({ ...s, type: 'assignment', date: s.submitted_at, score: s.score }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <Layout sidebarItems={sidebarItems} title="Students Overview">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Progress</h1>
          <p className="text-sm text-slate-400 mt-1">Track your learning journey and performance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proficiency Trend Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900">Proficiency Trend</h3>
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[10px] font-semibold">Live Data</span>
            </div>
            <div className="h-[280px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="quiz"
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      fontWeight={600}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#16a34a', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-400">Complete quizzes to see your trend</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              <BookOpen className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-3">
              {allAssessments.length > 0 ? allAssessments.slice(0, 6).map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-white hover:border-green-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.type === 'quiz' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                      {item.type === 'quiz' ? <Award className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {item.type === 'quiz' ? 'Quiz Attempt' : 'Assignment'}
                        </p>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${item.type === 'quiz' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {item.score !== null && item.score !== undefined ? (
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${item.score >= 80 ? 'bg-green-50 text-green-700 border border-green-100' :
                        item.score >= 60 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                      {item.type === 'quiz' ? `${item.score.toFixed(0)}%` : `${item.score} pts`}
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">
                      Pending
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-16">
                  <p className="text-sm text-slate-400">Complete assessments to see your activity here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentProgress
