import { create } from 'zustand'
import { User } from '@shared/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  setUser: (user: User | null) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await window.api.login({ username, password })
      if (response.success && response.user) {
        set({ user: response.user, isAuthenticated: true, isLoading: false })
        return true
      } else {
        set({ error: response.error || 'Login failed', isLoading: false })
        return false
      }
    } catch (error) {
      set({ error: 'Login failed', isLoading: false })
      return false
    }
  },

  logout: async () => {
    try {
      await window.api.logout()
      set({ user: null, isAuthenticated: false })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const response = await window.api.checkAuth()
      if (response.success && response.user) {
        set({ user: response.user, isAuthenticated: true, isLoading: false })
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false })
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user })
  },

  clearError: () => {
    set({ error: null })
  },
}))
