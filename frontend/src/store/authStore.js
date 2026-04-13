import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      
      setAuth: (data) => set({
        user: data.user,
        token: data.access_token,
        refreshToken: data.refresh_token
      }),
      
      logout: () => set({
        user: null,
        token: null,
        refreshToken: null
      }),
      
      updateUser: (userData) => set((state) => ({
        user: { ...state.user, ...userData }
      }))
    }),
    {
      name: 'auth-storage',
    }
  )
)
