import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // For FormData, delete Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          useAuthStore.getState().setAuth({
            user: response.data.user,
            access_token,
            refresh_token,
          })

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  googleAuth: (credential) => api.post('/auth/google', { credential }), // Changed to support ID token
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  requestPasswordReset: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, new_password) => api.post('/auth/reset-password', { token, new_password }),
}

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/count'),
  uploadAvatar: (formData) =>
    api.post('/users/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteAvatar: () => api.delete('/users/delete-avatar'),
  updateProfile: (data) => api.patch('/users/me', data),
}

// Courses API
export const coursesAPI = {
  getAll: (params) => api.get('/courses/', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.patch(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  uploadMaterial: (courseId, formData) => {
    // Don't set Content-Type header - let browser set it with boundary
    return api.post(`/courses/${courseId}/materials`, formData)
  },
  deleteMaterial: (courseId, materialId) => api.delete(`/courses/${courseId}/materials/${materialId}`),
  reindexMaterial: (courseId, materialId) => api.post(`/courses/${courseId}/materials/${materialId}/reindex`),
  enroll: (data) => api.post('/courses/enroll', data),
  getStudents: (courseId) => api.get(`/courses/${courseId}/students`),
  getAvailableForEnrollment: () => api.get('/courses/available/for-enrollment'),
  getAvailableForStudent: () => api.get('/courses/available/for-student'),
}

// Quiz API
export const quizAPI = {
  generate: (data) => api.post('/quiz/generate', data, { timeout: 300000 }), // 5 minute timeout for AI generation
  create: (data) => api.post('/quiz/', data),
  getByCourse: (courseId) => api.get(`/quiz/course/${courseId}`),
  getById: (id) => api.get(`/quiz/${id}`),
  getTeacherQuiz: (id) => api.get(`/quiz/answer-key/${id}`),
  submitAttempt: (data) => api.post('/quiz/attempt', data),
  getMyAttempts: () => api.get('/quiz/attempts/my'),
  getStudentAttempts: (studentId) => api.get(`/quiz/attempts/student/${studentId}`),
  getCourseAttempts: (courseId) => api.get(`/quiz/course/${courseId}/attempts`),
  delete: (id) => api.delete(`/quiz/${id}`),
  grantRetake: (attemptId, reason = null) => api.post(`/quiz/attempt/${attemptId}/grant-retake`, { reason }),
}

// RAG API
export const ragAPI = {
  query: (data) => api.post('/rag/query', data),
  chat: (courseId, query, sessionId = null, materialIds = null, modelProvider = 'groq') =>
    api.post('/rag/query', {
      course_id: courseId,
      query: query,
      session_id: sessionId,
      material_ids: materialIds,
      model_provider: modelProvider
    }),
  health: () => api.get('/rag/health'),
  getSessions: (courseId) => api.get(`/rag/sessions/${courseId}`),
  createSession: (courseId) => api.post('/rag/sessions', { course_id: courseId }),
  deleteSession: (sessionId) => api.delete(`/rag/sessions/${sessionId}`),
  getSessionHistory: (sessionId) => api.get(`/rag/history/${sessionId}`),
}

// Analytics API
export const analyticsAPI = {
  getUserAnalytics: (userId) => api.get(`/analytics/user/${userId}`),
  getCourseAnalytics: (courseId) => api.get(`/analytics/course/${courseId}`),
  getSystemAnalytics: () => api.get('/analytics/system'),
  updateUserAnalytics: (userId) => api.post(`/analytics/update/user/${userId}`),
  updateCourseAnalytics: (courseId) => api.post(`/analytics/update/course/${courseId}`),
}

// Assignment API
export const assignmentAPI = {
  create: (data) => api.post('/assignments/', data),
  getByCourse: (courseId) => api.get(`/assignments/course/${courseId}`),
  uploadAttachment: (assignmentId, formData) =>
    api.post(`/assignments/${assignmentId}/upload-attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  submit: (formData) =>
    api.post('/assignments/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  gradeSubmission: (submissionId, data) => api.patch(`/assignments/submission/${submissionId}/grade`, data),
  getMySubmissions: () => api.get('/assignments/my-submissions'),
  delete: (id) => api.delete(`/assignments/${id}`),
}

// Moderation API
export const moderationAPI = {
  getSettings: () => api.get('/moderation/settings'),
  createSettings: (data) => api.post('/moderation/settings', data),
  updateSettings: (category, data) => api.patch(`/moderation/settings/${category}`, data),
  getLogs: (params) => api.get('/moderation/logs', { params }),
  getLogById: (id) => api.get(`/moderation/logs/${id}`),
  getStats: () => api.get('/moderation/stats'),
}

// Departments API
export const departmentsAPI = {
  getAll: () => api.get('/departments/'),
  create: (data) => api.post('/departments/', data),
  delete: (id) => api.delete(`/departments/${id}`),
}

// Notifications API
export const notificationAPI = {
  getMine: () => api.get('/notifications/'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

export default api
