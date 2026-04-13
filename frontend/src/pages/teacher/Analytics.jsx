import { BookOpen, TrendingUp, BarChart3, Sparkles, Brain } from 'lucide-react'
import Layout from '../../components/Layout'

const TeacherAnalytics = () => {
  const sidebarItems = [
    { label: 'Overview', path: '/teacher', icon: TrendingUp },
    { label: 'My Courses', path: '/teacher/courses', icon: BookOpen },
    { label: 'Performance', path: '/teacher/analytics', icon: BarChart3 },
  ]

  return (
    <Layout sidebarItems={sidebarItems} title="Knowledge Metrics">
      <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50/50 rounded-full blur-[100px] -mr-48 -mt-48"></div>

        <div className="relative z-10 flex flex-col items-center text-center py-20">
          <div className="w-24 h-24 bg-teal-50 rounded-[2.5rem] flex items-center justify-center text-[#14BF96] mb-8 shadow-soft border border-teal-100">
            <BarChart3 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Deep Learning Analytics</h2>
          <p className="text-slate-500 max-w-lg mx-auto font-medium leading-relaxed mb-10">
            We are aggregating student performance data and competency trends across your active curricula.
            Detailed knowledge graphs and performance matrices will appear here shortly.
          </p>
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 rounded-full border border-slate-100">
            <div className="w-2 h-2 bg-[#14BF96] rounded-full animate-pulse"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Compiling Live Curriculum Data</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default TeacherAnalytics
