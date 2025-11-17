import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark' // Default to dark
}

// Apply theme to document
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    root.setAttribute('data-theme', theme)
  }
}

// Resolve theme based on setting
const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme)
        applyTheme(resolved)
        set({ theme, resolvedTheme: resolved })
      },

      toggleTheme: () => {
        const currentTheme = get().theme
        let newTheme: Theme

        if (currentTheme === 'dark') {
          newTheme = 'light'
        } else if (currentTheme === 'light') {
          newTheme = 'system'
        } else {
          newTheme = 'dark'
        }

        const resolved = resolveTheme(newTheme)
        applyTheme(resolved)
        set({ theme: newTheme, resolvedTheme: resolved })
      },
    }),
    {
      name: 'posplus-theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on hydration
          const resolved = resolveTheme(state.theme)
          applyTheme(resolved)
          state.resolvedTheme = resolved
        }
      },
    }
  )
)

// Listen for system theme changes
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState()
    if (store.theme === 'system') {
      const newTheme = e.matches ? 'dark' : 'light'
      applyTheme(newTheme)
      useThemeStore.setState({ resolvedTheme: newTheme })
    }
  })
}
