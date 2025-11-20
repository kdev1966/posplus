import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguageStore } from '../../store/languageStore'
import { TranslationKey } from '../../i18n/translations'

const menuItems: { path: string; icon: string; labelKey: TranslationKey }[] = [
  { path: '/dashboard', icon: '📊', labelKey: 'dashboard' },
  { path: '/pos', icon: '🛒', labelKey: 'pos' },
  { path: '/products', icon: '📦', labelKey: 'products' },
  { path: '/categories', icon: '🏷️', labelKey: 'categories' },
  { path: '/stock', icon: '📈', labelKey: 'stock' },
  { path: '/history', icon: '📜', labelKey: 'history' },
  { path: '/users', icon: '👥', labelKey: 'users' },
  { path: '/settings', icon: '⚙️', labelKey: 'settings' },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const t = useLanguageStore((state) => state.t)

  const handleQuit = async () => {
    const confirmMessage = 'Êtes-vous sûr de vouloir quitter l\'application ?'
    if (window.confirm(confirmMessage)) {
      try {
        await window.api.quitApp()
      } catch (error) {
        console.error('Failed to quit app:', error)
      }
    }
  }

  return (
    <aside className="w-64 glass border-r border-white/10 flex flex-col">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gradient glow-text">
          POSPlus
        </h1>
        <p className="text-xs text-gray-400 mt-1">{t('posSystem')}</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-neon-blue'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={handleQuit}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">{t('quit')}</span>
        </button>
        <div className="text-xs text-gray-500 text-center">
          v1.0.0 · POSPlus © 2025
        </div>
      </div>
    </aside>
  )
}
