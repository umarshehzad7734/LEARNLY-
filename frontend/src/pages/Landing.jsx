import { motion, useInView } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import {
  BookOpen,
  Brain,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Star,
  TrendingUp,
  BarChart3,
  Phone,
  MessageSquare,
  Search,
  Calendar,
  FileText,
  Lightbulb,
  GraduationCap,
  Shield,
  Clock,
  Zap,
  Monitor,
  Award
} from 'lucide-react'

// Animated Counter Component
const AnimatedCounter = ({ end, duration = 2, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      let startTime
      let animationFrame

      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime
        const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)

        setCount(Math.floor(progress * end))

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate)
        }
      }

      animationFrame = requestAnimationFrame(animate)
      return () => cancelAnimationFrame(animationFrame)
    }
  }, [isInView, end, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

const Landing = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Search,
      title: 'Choosing a Service',
      description: 'Find the right AI-powered learning tools tailored to your specific academic needs and goals.'
    },
    {
      icon: MessageSquare,
      title: 'Our Clients Say',
      description: 'Hear from thousands of students and educators who have transformed their learning experience.'
    },
    {
      icon: Calendar,
      title: 'Initial Consultation',
      description: 'Get personalized onboarding and setup to ensure the platform works perfectly for your courses.'
    },
    {
      icon: Phone,
      title: 'Request a Callback',
      description: 'Connect with our team to learn how Learnly can help your institution achieve better outcomes.'
    }
  ]

  const benefits = [
    { icon: Brain, text: 'AI-powered tutoring that adapts to your learning style' },
    { icon: BookOpen, text: 'Smart content indexing for instant answers' },
    { icon: BarChart3, text: 'Detailed performance analytics and tracking' },
    { icon: Shield, text: 'Safe, moderated learning environment' },
    { icon: Clock, text: 'Available 24/7, learn at your own pace' },
    { icon: Zap, text: 'Instant quiz generation from course materials' }
  ]

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Computer Science Student',
      content: 'My academic life before Learnly was scattered and overwhelming. The AI co-instructor completely changed how I study, providing clarity and personalized support exactly when I needed it.',
      rating: 5,
      avatar: '👩‍💻'
    },
    {
      name: 'Prof. James Chen',
      role: 'University Lecturer',
      content: 'We believe in innovative education combined with personalized learning tools that enable both students and educators to achieve excellence in their academic pursuits.',
      rating: 5,
      avatar: '👨‍🏫'
    },
    {
      name: 'Alex Rodriguez',
      role: 'Data Science Student',
      content: 'The adaptive quizzes and progress analytics keep me motivated and on track. I can see exactly where I need to improve. Learnly has become an essential part of my learning routine.',
      rating: 5,
      avatar: '🎓'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-gradient-to-br from-[#14BF96] to-[#0d9e7b] rounded-lg flex items-center justify-center">
                <span className="text-white font-extrabold text-sm">L</span>
              </div>
              <span className="text-lg font-extrabold tracking-tight text-gray-900">LEARNLY</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="text-sm font-semibold text-white bg-[#14BF96] hover:bg-[#0d9e7b] px-5 py-2 rounded-lg transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 relative">
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a2332 0%, #243447 40%, #2a3f55 100%)' }}>
          {/* Decorative hero image area on the right */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 hidden lg:block">
            <div className="absolute inset-0" style={{
              backgroundImage: `url('/learnly-hero-mockup.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'brightness(0.6) contrast(1.1)'
            }} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a2332] via-[#1a2332]/50 to-transparent" />
          </div>

          {/* Overlay gradient circles */}
          <div className="absolute top-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[#14BF96]/8 blur-[100px]" />
          <div className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[80px]" />

          <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-20 lg:py-28">
              {/* Hero Text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.1] mb-6">
                  Learn Smarter with<br />
                  Your Personal<br />
                  <span className="text-[#14BF96]">AI Co-Instructor</span>
                </h1>

                <p className="text-base md:text-lg text-gray-300 mb-8 leading-relaxed max-w-lg">
                  Experience adaptive education powered by cutting-edge AI. Get instant answers, personalized quizzes, and insights that transform how you learn.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-2 bg-[#14BF96] hover:bg-[#0d9e7b] text-white font-semibold text-sm px-7 py-3 rounded-lg transition-all hover:-translate-y-0.5 shadow-lg shadow-[#14BF96]/20"
                  >
                    Start Learning Free
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white font-medium text-sm transition-all px-5 py-3"
                  >
                    Already have an account?
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>

              {/* Hero Image / Dashboard Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative hidden lg:block"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                  {/* Mock dashboard content */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 aspect-[4/3] flex items-center justify-center">
                    <div className="w-full max-w-md space-y-4">
                      {/* Mock top bar */}
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-3 h-3 rounded-full bg-red-400" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400" />
                        <div className="w-3 h-3 rounded-full bg-green-400" />
                        <div className="flex-1 bg-gray-200 h-6 rounded-lg ml-2" />
                      </div>
                      {/* Mock content blocks */}
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-[#14BF96]/10 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-[#14BF96]" />
                          </div>
                          <div className="h-3 bg-gray-200 rounded flex-1" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-100 rounded w-full" />
                          <div className="h-2 bg-gray-100 rounded w-3/4" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="w-6 h-6 rounded bg-blue-50 mb-2 flex items-center justify-center">
                            <BarChart3 className="w-3 h-3 text-blue-500" />
                          </div>
                          <div className="h-2 bg-gray-100 rounded w-2/3 mb-1" />
                          <div className="text-lg font-bold text-gray-800">94.2%</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="w-6 h-6 rounded bg-emerald-50 mb-2 flex items-center justify-center">
                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                          </div>
                          <div className="h-2 bg-gray-100 rounded w-2/3 mb-1" />
                          <div className="text-lg font-bold text-gray-800">+12.5%</div>
                        </div>
                      </div>
                      {/* Chart mockup */}
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <div className="h-2 bg-gray-200 rounded w-1/3 mb-4" />
                        <div className="flex items-end gap-1 h-20">
                          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-t"
                              style={{
                                height: `${h}%`,
                                backgroundColor: i >= 9 ? '#14BF96' : '#e2e8f0'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-8 px-6 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3"
            >
              <Users className="w-6 h-6 text-[#14BF96]" />
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                  <AnimatedCounter end={14} suffix="K+" />
                </div>
                <div className="text-xs text-gray-500 font-medium">Active Students</div>
              </div>
            </motion.div>

            <div className="hidden md:block h-10 w-px bg-gray-200" />

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <BookOpen className="w-6 h-6 text-[#14BF96]" />
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                  <AnimatedCounter end={500} suffix="+" />
                </div>
                <div className="text-xs text-gray-500 font-medium">Courses Created</div>
              </div>
            </motion.div>

            <div className="hidden md:block h-10 w-px bg-gray-200" />

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <Award className="w-6 h-6 text-[#14BF96]" />
              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
                  <AnimatedCounter end={90} suffix="%" />
                </div>
                <div className="text-xs text-gray-500 font-medium">Satisfaction Rate</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - "Everything you need to succeed" */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-sm text-gray-500 mb-2 font-medium">
                Powerful AI tools designed to enhance your learning experience and accelerate your academic growth.
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                Everything you need to<br />succeed in your studies
              </h2>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group text-center p-6 rounded-2xl bg-white border border-gray-100 hover:border-[#14BF96]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#14BF96] flex items-center justify-center shadow-md shadow-[#14BF96]/20 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - "Designed for the modern learner" */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                <TrendingUp className="w-3 h-3" />
                <span>Why Choose Learnly</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4 leading-tight">
                Designed for the<br />modern learner
              </h2>
              <p className="text-base text-gray-600 mb-8 leading-relaxed">
                We've built Learnly from the ground up to support your unique learning style with intelligent, adaptive technology.
              </p>

              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-[#14BF96]/30 hover:shadow-sm transition-all"
                  >
                    <div className="w-9 h-9 bg-[#14BF96]/10 rounded-lg flex items-center justify-center shrink-0">
                      <benefit.icon className="w-4 h-4 text-[#14BF96]" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-6">
                What you get and what others say: <a href="#" className="text-[#14BF96] font-semibold hover:underline">Top Data here</a>,{' '}
                <a href="#" className="text-[#14BF96] font-semibold hover:underline">Best Practices</a>
              </p>
            </motion.div>

            {/* Right - Dashboard Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {/* Mock browser top bar */}
                <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <div className="flex-1 bg-gray-200 h-5 rounded ml-3 max-w-xs" />
                </div>

                <div className="p-6">
                  {/* Title area */}
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">What is the agenda today?</div>
                    <div className="text-sm font-bold text-gray-800">Dashboard Overview</div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">Live tracking</div>
                      <div className="text-xs text-gray-400">Real-time</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-800">Analytics</div>
                      <div className="text-xs text-gray-400">Performance</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-[#14BF96] font-extrabold">24,205</div>
                      <div className="text-xs text-gray-400">Total Views</div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-end gap-1.5 h-28">
                      {[35, 55, 40, 70, 50, 85, 60, 75, 45, 90, 65, 80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t transition-all"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i >= 8 ? '#14BF96' : '#d1d5db'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg px-4 py-2 border border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#14BF96] rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">AI Active</div>
                    <div className="text-xs font-bold text-gray-800">Ready to Help</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-sm font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-3">
                Loved by students<br />and educators alike
              </h2>
              <p className="text-base text-gray-500 max-w-2xl mx-auto">
                Intelligently designed, effortlessly powerful—discover why learners & educators
                <br />across the world trust Learnly to transform their education.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {/* Stars */}
                <div className="flex gap-0.5 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{testimonial.name}</div>
                    <div className="text-xs text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-[#1a3a2a] via-[#1a4035] to-[#14BF96] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(#fff 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px'
          }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
              Ready to transform<br />your learning experience
            </h2>
            <p className="text-base text-white/70 mb-8 max-w-lg mx-auto">
              Join thousands of students already learning smarter with AI-powered education.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="inline-flex items-center justify-center gap-2 bg-white text-[#14BF96] hover:bg-gray-50 font-bold text-sm px-8 py-3.5 rounded-lg transition-all hover:-translate-y-0.5 shadow-xl"
              >
                Get Started Free
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 font-medium text-sm px-8 py-3.5 rounded-lg transition-all backdrop-blur-sm"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100">
        {/* Top green accent line */}
        <div className="h-1 bg-gradient-to-r from-[#14BF96] via-[#0d9e7b] to-[#14BF96]" />

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#14BF96] to-[#0d9e7b] rounded-lg flex items-center justify-center">
                  <span className="text-white font-extrabold text-sm">L</span>
                </div>
                <span className="text-lg font-extrabold tracking-tight text-gray-900">LEARNLY</span>
              </div>
              <p className="text-sm text-gray-500 mb-4 max-w-xs leading-relaxed">
                Empowering learners worldwide with intelligent, adaptive education technology powered by AI.
              </p>
              <div className="flex gap-3">
                <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-[#14BF96] hover:text-white rounded-lg flex items-center justify-center transition-all text-gray-500 text-xs font-bold">𝕏</a>
                <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-[#14BF96] hover:text-white rounded-lg flex items-center justify-center transition-all text-gray-500 text-xs font-bold">in</a>
                <a href="#" className="w-8 h-8 bg-gray-100 hover:bg-[#14BF96] hover:text-white rounded-lg flex items-center justify-center transition-all text-gray-500 text-xs font-bold">✉</a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 text-sm">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Features</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Use Cases</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Documentation</a></li>
              </ul>
            </div>

            {/* Explore */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 text-sm">Explore</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Resources</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Help Center</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Community</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-gray-900 mb-4 text-sm">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Careers</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm text-gray-500 hover:text-[#14BF96] transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">
              © 2025 Learnly Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Made with</span>
              <span className="text-red-400 text-sm">♥</span>
              <span className="text-xs text-gray-400">for better education</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
