import Layout from '../../components/Layout'
import { BarChart3, Users, BookOpen, Shield, TrendingUp, Search, Filter, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'

const Analytics = () => {
  const sidebarItems = [
    { label: 'Infrastructure', path: '/admin', icon: BarChart3 },
    { label: 'Directory', path: '/admin/users', icon: Users },
    { label: 'Curriculum', path: '/admin/courses', icon: BookOpen },
    { label: 'Governance', path: '/admin/moderation', icon: Shield },
    { label: 'Analytics', path: '/admin/analytics', icon: TrendingUp },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
  ]

  return (
    <Layout sidebarItems={sidebarItems} title="System Analytics">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-10 shadow-sm relative overflow-hidden flex flex-col justify-center"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-soft flex items-center justify-center mb-8 text-[#14BF96]">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Intelligence Dashboard</h3>
            <p className="text-slate-500 font-medium leading-relaxed max-w-md mb-8">
              Deep-spectrum analysis of platform velocity, user retention algorithms, and curriculum engagement depth.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button className="btn-primary px-8 py-3.5 text-[10px] font-black uppercase tracking-widest shadow-red-100 rounded-2xl">
                Generate Audit
              </button>
              <button className="text-[10px] font-black text-slate-400 hover:text-[#14BF96] transition-colors uppercase tracking-[0.2em] px-4 py-2">
                Comparative Meta-Data
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4">
          {[
            { label: 'User Retention', value: '84.2%', trend: '+2.4%', color: 'indigo' },
            { label: 'System Velocity', value: '24m 12s', trend: '+1m 05s', color: 'emerald' },
            { label: 'Curriculum Depth', value: '72.8%', trend: '-0.5%', color: 'amber' },
            { label: 'Network Activity', value: '92.1%', trend: '+5.2%', color: 'rose' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-premium hover:border-teal-100 transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className={`w-1.5 h-10 rounded-full ${stat.color === 'indigo' ? 'bg-[#14BF96]' :
                  stat.color === 'emerald' ? 'bg-emerald-600' :
                    stat.color === 'amber' ? 'bg-amber-600' :
                      'bg-rose-600'
                  }`}></div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-[#14BF96] transition-colors">{stat.label}</p>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-[10px] font-black tracking-widest ${stat.trend.startsWith('+')
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-teal-50 text-rose-700 border-teal-100'
                }`}>
                {stat.trend}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Analytics
