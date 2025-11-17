import { create } from 'zustand'
import { CashSession } from '@shared/types'

interface SessionState {
  currentSession: CashSession | null
  isSessionOpen: boolean
  isLoading: boolean
  error: string | null
  fetchCurrentSession: () => Promise<void>
  openSession: (userId: number, openingCash: number) => Promise<boolean>
  closeSession: (sessionId: number, closingCash: number) => Promise<boolean>
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentSession: null,
  isSessionOpen: false,
  isLoading: false,
  error: null,

  fetchCurrentSession: async () => {
    set({ isLoading: true, error: null })
    try {
      const session = await window.api.getCurrentSession()
      set({
        currentSession: session,
        isSessionOpen: session?.status === 'open',
        isLoading: false,
      })
    } catch (error) {
      set({ error: 'Failed to fetch session', isLoading: false })
    }
  },

  openSession: async (userId, openingCash) => {
    set({ isLoading: true, error: null })
    try {
      const session = await window.api.openSession(userId, openingCash)
      set({
        currentSession: session,
        isSessionOpen: true,
        isLoading: false,
      })
      return true
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to open session'
      set({ error: errorMessage, isLoading: false })
      console.error('Failed to open session:', error)
      throw error // Re-throw so Settings.tsx can catch it
    }
  },

  closeSession: async (sessionId, closingCash) => {
    set({ isLoading: true, error: null })
    try {
      const session = await window.api.closeSession(sessionId, closingCash)
      set({
        currentSession: session,
        isSessionOpen: false,
        isLoading: false,
      })
      return true
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to close session'
      set({ error: errorMessage, isLoading: false })
      console.error('Failed to close session:', error)
      throw error // Re-throw so Settings.tsx can catch it
    }
  },

  clearSession: () => {
    set({ currentSession: null, isSessionOpen: false })
  },
}))
