import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { useLanguageStore } from '../../store/languageStore'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { currentSession, isSessionOpen } = useSessionStore()
  const { t } = useLanguageStore()

  return (
    <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-gray-400">{t('welcomeBack')},</p>
          <p className="font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Session Status */}
        {isSessionOpen && currentSession && (
          <div className="flex items-center gap-2">
            <Badge variant="success">{t('sessionOpen')}</Badge>
            <span className="text-sm text-gray-400">
              {t('openingCash')}: {formatCurrency(currentSession.openingCash)}
            </span>
          </div>
        )}

        {!isSessionOpen && (
          <Badge variant="warning">{t('noSession')}</Badge>
        )}

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>

          <Button variant="ghost" onClick={logout}>
            {t('logout')}
          </Button>
        </div>
      </div>
    </header>
  )
}
