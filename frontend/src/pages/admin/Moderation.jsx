import { useState, useEffect } from 'react'
import { Shield, BarChart3, Users, BookOpen, TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Layout from '../../components/Layout'
import { moderationAPI } from '../../utils/api'

const Moderation = () => {
  const [settings, setSettings] = useState([])
  const [logs, setLogs] = useState([])

  const sidebarItems = [
    { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
    { label: 'Directory', path: '/admin/users', icon: Users },
    { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
    { label: 'Governance', path: '/admin/moderation', icon: Shield },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [settingsRes, logsRes] = await Promise.all([
        moderationAPI.getSettings(),
        moderationAPI.getLogs({ limit: 10 })
      ])
      setSettings(settingsRes.data)
      setLogs(logsRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    }
  }

  return (
    <Layout sidebarItems={sidebarItems} title="Content Moderation">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden sticky top-8">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em]">System Protocols</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Autonomous Guardrails</p>
              </div>
              <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl shadow-soft flex items-center justify-center text-[#14BF96]">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="p-4 space-y-2">
              {settings.map((setting) => (
                <div key={setting.id} className="p-5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl transition-all flex items-center justify-between group cursor-pointer">
                  <div>
                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight mb-1 group-hover:text-[#14BF96] transition-colors">{setting.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">THRES: {setting.threshold}</span>
                    </div>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-all relative border ${setting.is_enabled ? 'bg-[#14BF96] border-[#14BF96]' : 'bg-slate-100 border-slate-200'
                    }`}>
                    <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full transition-all shadow-sm ${setting.is_enabled ? 'left-5.5' : 'left-0.5'
                      }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Activity Logs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.15em]">Moderation Stream</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Safety Logs</p>
              </div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Sync Authorized</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Content Overview</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Profile</th>
                    <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">System Verdict</th>
                    <th className="px-8 py-4 border-b border-slate-100"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-900 line-clamp-1 max-w-md tracking-tight group-hover:text-[#14BF96] transition-colors">{log.content}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg shadow-sm">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${log.flagged
                            ? 'bg-teal-50 text-rose-700 border-teal-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                            {log.flagged ? (
                              <><AlertCircle className="w-3.5 h-3.5" /> Flagged</>
                            ) : (
                              <><CheckCircle2 className="w-3.5 h-3.5" /> Approved</>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-[#14BF96] hover:border-teal-100 transition-all shadow-soft opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  )
}

export default Moderation
