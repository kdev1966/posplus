import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

export const Login: React.FC = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const t = useLanguageStore((state) => state.t)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const success = await login(username, password)

    if (success) {
      navigate('/dashboard')
    } else {
      setError(t('invalidCredentials'))
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gradient glow-text mb-2">
            POSPlus
          </h1>
          <p className="text-gray-400">{t('posSystem')}</p>
        </div>

        <div className="card scale-in">
          <h2 className="text-2xl font-bold mb-6 text-white">{t('login')}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('username')}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('enterUsername')}
              autoFocus
              required
            />

            <Input
              label={t('password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              required
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full"
            >
              {t('signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
