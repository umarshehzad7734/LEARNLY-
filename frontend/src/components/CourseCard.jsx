import { motion } from 'framer-motion'
import { BookOpen, Users, FileText, Trophy, ChevronRight } from 'lucide-react'

const CourseCard = ({ course, onClick, showActions = false, actions = null }) => {
  // Get initials from teacher name
  const getInitials = (name) => {
    if (!name) return '??'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Generate a subtle color based on the teacher name
  const getColorClass = (name) => {
    if (!name) return 'bg-slate-100 text-slate-600'
    const colors = [
      'bg-teal-50 text-[#14BF96] border-teal-100',
      'bg-slate-50 text-slate-700 border-slate-100',
      'bg-emerald-50 text-emerald-700 border-emerald-100',
      'bg-violet-50 text-violet-700 border-violet-100',
    ]
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    return colors[index]
  }

  const teacherInitials = getInitials(course.teacher_name)
  const avatarStyle = getColorClass(course.teacher_name)

  return (

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group bg-gradient-to-br from-white via-slate-50/20 to-white border-2 border-slate-200/80 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-300 transition-all duration-300 relative cursor-pointer h-full flex flex-col"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#14BF96] opacity-30 group-hover:opacity-100 transition-opacity"></div>

      <div className="p-7 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black text-[#14BF96] bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-teal-100/50">
                {course.course_code || 'CRS-001'}
              </span>
              {course.credits && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  {course.credits} Credits
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900 group-hover:text-[#14BF96] transition-colors line-clamp-2 leading-tight tracking-tight">
              {course.title}
            </h3>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ml-3 border-2 ${avatarStyle}`}>
            {teacherInitials}
          </div>
        </div>

        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-6 font-medium">
          {course.description}
        </p>

        <div className="mt-auto border-t border-slate-100 pt-5 flex items-center justify-between text-xs text-slate-500 font-semibold mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{course.teacher_name || 'Instructor'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>{course.materials?.length || 0} Topics</span>
          </div>
        </div>

        {showActions && actions && (
          <div className="mt-auto pt-2">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}


export default CourseCard
