import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Sparkles, BookOpen, TrendingUp, BarChart3, Zap } from 'lucide-react'
import Layout from '../../components/Layout'
import { quizAPI, coursesAPI } from '../../utils/api'

const TeacherQuiz = () => {
  const { courseId } = useParams()
  const [formData, setFormData] = useState({
    topic: '',
    difficulty: 'medium',
    num_questions: 5,
    model_provider: 'groq',
    material_ids: [],
    is_adaptive: true  // When true, difficulty is auto-calculated based on student competency
  })
  const [materials, setMaterials] = useState([])
  const [generated, setGenerated] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetchingMaterials, setFetchingMaterials] = useState(true)

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const response = await coursesAPI.getById(courseId)
        // Adjust based on your API response structure, assuming materials are in response.data.materials
        setMaterials(response.data.materials || [])
      } catch (error) {
        console.error('Failed to fetch materials:', error)
      } finally {
        setFetchingMaterials(false)
      }
    }
    if (courseId) fetchMaterials()
  }, [courseId])

  const sidebarItems = [
    { label: 'Overview', path: '/teacher', icon: TrendingUp },
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { label: 'Performance', path: '/teacher/analytics', icon: BarChart3 },
  ]

  const handleGenerate = async (e) => {
    if (formData.material_ids.length === 0) {
      alert('Please select at least one material to generate quiz from')
      return
    }

    setLoading(true)
    try {
      const response = await quizAPI.generate({
        course_id: parseInt(courseId),
        ...formData
      })
      setGenerated(response.data)
    } catch (error) {
      console.error('Failed to generate quiz:', error)
      const detail = error.response?.data?.detail || error.message
      alert(`Generation Failed: ${detail}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Generate Quiz">
      <div className="card-glass max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">AI Quiz Generator</h3>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
              AI Model
            </label>
            <div className="flex bg-slate-100 p-3 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-700">
                <Zap className="w-4 h-4 text-[#14BF96]" />
                <span>Groq (Lightning Fast)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Select Materials (from Curriculum)
            </label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {fetchingMaterials ? (
                <p className="text-xs text-slate-500 p-2">Loading materials...</p>
              ) : materials.length > 0 ? (
                materials.map(m => (
                  <label key={m.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.material_ids.includes(m.id) ? 'bg-teal-50 border border-teal-100' : 'hover:bg-white'}`}>
                    <input
                      type="checkbox"
                      checked={formData.material_ids.includes(m.id)}
                      disabled={!m.vector_store_id}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...formData.material_ids, m.id]
                          : formData.material_ids.filter(id => id !== m.id)
                        setFormData({ ...formData, material_ids: ids })
                      }}
                      className="w-4 h-4 text-[#14BF96] rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{m.title}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{m.file_type} • {m.vector_store_id ? 'Indexed' : 'Not Indexed'}</p>
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-xs text-slate-500 p-2">No materials available for this course.</p>
              )}
            </div>
          </div>


          <input
            type="text"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            placeholder="Topic (optional)"
            className="input w-full"
          />


          {/* Adaptive Mode Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Adaptive Mode
            </label>
            <label className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border-2 ${formData.is_adaptive ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
              <input
                type="checkbox"
                checked={formData.is_adaptive}
                onChange={(e) => setFormData({ ...formData, is_adaptive: e.target.checked })}
                className="w-5 h-5 text-[#14BF96] rounded"
              />
              <div className="flex-1">
                <p className={`text-sm font-bold ${formData.is_adaptive ? 'text-[#14BF96]' : 'text-slate-700'}`}>
                  Adaptive Quiz (3 Tiers)
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  {formData.is_adaptive
                    ? 'Generates Easy, Medium & Hard tiers — each student gets their level'
                    : 'Toggle on to auto-generate 3 difficulty tiers'}
                </p>
              </div>
            </label>
          </div>

          {/* Difficulty Selector - only shown when adaptive is off */}
          {!formData.is_adaptive && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="input w-full"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          )}

          <input
            type="number"
            value={formData.num_questions}
            onChange={(e) => setFormData({ ...formData, num_questions: parseInt(e.target.value) })}
            min="1"
            max="20"
            className="input w-full"
          />

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center space-x-2 py-4 rounded-xl">
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Generating...' : 'Generate Quiz'}</span>
          </button>
        </form>

        {generated && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-semibold">
              Quiz generated successfully with {generated.questions?.length} questions
              {formData.is_adaptive ? ' across 3 difficulty tiers (Easy, Medium, Hard)!' : '!'}
            </p>
            {formData.is_adaptive && (
              <p className="text-green-600 text-sm mt-1">
                Each student will receive questions matching their competency level.
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default TeacherQuiz
