import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguageStore } from '../../store/languageStore'
import { useSidebarStore } from '../../store/sidebarStore'
import { TranslationKey } from '../../i18n/translations'
import P2PStatus from '../P2PStatus'

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
  const { isCollapsed, toggleSidebar } = useSidebarStore()

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
    <aside
      className={`glass border-r border-white/10 flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Header with Toggle Button */}
      <div className={`p-6 ${isCollapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-3xl font-bold text-gradient glow-text">POS+</h1>
              <p className="text-xs text-gray-400 mt-1">{t('posSystem')}</p>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all ${
              isCollapsed ? 'w-full flex justify-center' : ''
            }`}
            title={isCollapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            <span className="text-xl">{isCollapsed ? '▶️' : '◀️'}</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-neon-blue'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              title={isCollapsed ? t(item.labelKey) : ''}
            >
              <span className="text-xl">{item.icon}</span>
              {!isCollapsed && <span className="font-medium">{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={`p-3 border-t border-white/10 space-y-2 ${isCollapsed ? 'px-2' : ''}`}>
        {/* P2P Status - hide when collapsed */}
        {!isCollapsed && <P2PStatus />}

        <button
          onClick={handleQuit}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all`}
          title={isCollapsed ? t('quit') : ''}
        >
          <span className="text-xl">🚪</span>
          {!isCollapsed && <span className="font-medium">{t('quit')}</span>}
        </button>
        {!isCollapsed && (
          <div className="text-xs text-gray-500 text-center">v1.0.0 · POS+ © 2025</div>
        )}
      </div>
    </aside>
  )
}
