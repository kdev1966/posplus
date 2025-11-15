import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSessionStore } from '../../store/sessionStore'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { currentSession, isSessionOpen } = useSessionStore()

  return (
    <header className="h-16 glass border-b border-white/10 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div>
          <p className="text-sm text-gray-400">Welcome back,</p>
          <p className="font-semibold text-white">
            {user?.firstName} {user?.lastName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Session Status */}
        {isSessionOpen && currentSession && (
          <div className="flex items-center gap-2">
            <Badge variant="success">Session Open</Badge>
            <span className="text-sm text-gray-400">
              Opening: €{currentSession.openingCash.toFixed(2)}
            </span>
          </div>
        )}

        {!isSessionOpen && (
          <Badge variant="warning">No Session</Badge>
        )}

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {user?.firstName?.charAt(0)}
            {user?.lastName?.charAt(0)}
          </div>

          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
