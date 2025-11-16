import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Language, TranslationKey, getTranslation } from '../i18n/translations'

interface LanguageState {
  currentLanguage: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  isRTL: () => boolean
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      currentLanguage: 'fr', // French as default

      setLanguage: (lang: Language) => {
        set({ currentLanguage: lang })
        // Update document direction for RTL support
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
      },

      t: (key: TranslationKey) => {
        return getTranslation(get().currentLanguage, key)
      },

      isRTL: () => {
        return get().currentLanguage === 'ar'
      },
    }),
    {
      name: 'posplus-language',
    }
  )
)

// Initialize document direction on load
const initializeDirection = () => {
  const savedLang = localStorage.getItem('posplus-language')
  if (savedLang) {
    try {
      const parsed = JSON.parse(savedLang)
      const lang = parsed.state?.currentLanguage || 'fr'
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = lang
    } catch {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = 'fr'
    }
  }
}

initializeDirection()
