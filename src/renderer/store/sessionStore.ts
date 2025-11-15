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
    } catch (error) {
      set({ error: 'Failed to open session', isLoading: false })
      return false
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
    } catch (error) {
      set({ error: 'Failed to close session', isLoading: false })
      return false
    }
  },

  clearSession: () => {
    set({ currentSession: null, isSessionOpen: false })
  },
}))
