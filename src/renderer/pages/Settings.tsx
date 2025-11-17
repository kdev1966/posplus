import React, { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const { currentSession, isSessionOpen, openSession, closeSession, fetchCurrentSession } = useSessionStore()
  const { t, currentLanguage, setLanguage } = useLanguageStore()

  const [openingCash, setOpeningCash] = useState('100.000')
  const [closingCash, setClosingCash] = useState('0.000')

  // Fetch current session on component mount
  useEffect(() => {
    fetchCurrentSession()
  }, [])

  const handleOpenSession = async () => {
    if (!user) return

    const amount = parseFloat(openingCash)
    if (isNaN(amount) || amount < 0) {
      alert(t('error'))
      return
    }

    try {
      await openSession(user.id, amount)
      alert('Session ouverte avec succès')
    } catch (error: any) {
      const errorMsg = error?.message || 'Échec de l\'ouverture de session'
      alert(`Erreur: ${errorMsg}`)
      console.error('Error opening session:', error)
    }
  }

  const handleCloseSession = async () => {
    if (!currentSession) return

    const amount = parseFloat(closingCash)
    if (isNaN(amount) || amount < 0) {
      alert(t('error'))
      return
    }

    try {
      await closeSession(currentSession.id, amount)
      alert('Session fermée avec succès')
    } catch (error: any) {
      const errorMsg = error?.message || 'Échec de la fermeture de session'
      alert(`Erreur: ${errorMsg}`)
      console.error('Error closing session:', error)
    }
  }

  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1:
        return t('administrator')
      case 2:
        return t('manager')
      case 3:
        return t('cashier')
      default:
        return 'Unknown'
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('settingsTitle')}</h1>
          <p className="text-gray-400">{t('systemConfiguration')}</p>
        </div>

        {/* Language Settings */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">Langue / اللغة</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setLanguage('fr')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                currentLanguage === 'fr'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-2xl mb-2">🇫🇷</div>
              <div className="font-semibold text-white">Français</div>
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                currentLanguage === 'ar'
                  ? 'border-primary-500 bg-primary-500/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="text-2xl mb-2">🇹🇳</div>
              <div className="font-semibold text-white">العربية</div>
            </button>
          </div>
        </Card>

        {/* Cash Session Management */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">{t('cashSessionManagement')}</h2>

          {!isSessionOpen ? (
            <div className="space-y-4">
              <p className="text-gray-400">{t('pleaseOpenSession')}</p>

              <Input
                label={`${t('openingCash')} (DT)`}
                type="number"
                step="0.001"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0.000"
              />

              <Button variant="success" onClick={handleOpenSession}>
                {t('openSession')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">{t('currentSession')}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('openingCash')}</p>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(currentSession?.openingCash ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('startedAt')}</p>
                    <p className="text-lg font-bold text-white">
                      {currentSession ? new Date(currentSession.startedAt).toLocaleTimeString('fr-FR') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('status')}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                      OPEN
                    </span>
                  </div>
                </div>
              </div>

              <Input
                label={`${t('closingCash')} (DT)`}
                type="number"
                step="0.001"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="0.000"
              />

              <Button variant="danger" onClick={handleCloseSession}>
                {t('closeSession')}
              </Button>
            </div>
          )}
        </Card>

        {/* System Information */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">{t('systemInfo')}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('appVersion')}</span>
              <span className="text-white font-semibold">POSPlus v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('currentUser')}</span>
              <span className="text-white font-semibold">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('userRole')}</span>
              <span className="text-white font-semibold">{user?.roleId ? getRoleName(user.roleId) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('currency')}</span>
              <span className="text-white font-semibold">Dinar Tunisien (TND)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pays</span>
              <span className="text-white font-semibold">Tunisie 🇹🇳</span>
            </div>
          </div>
        </Card>

        {/* Printer Settings */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">{t('printerSettings')}</h2>
          <div className="space-y-4">
            <Button variant="primary" onClick={async () => {
              try {
                await window.api.openDrawer()
                alert('Tiroir-caisse ouvert')
              } catch (error) {
                alert('Échec de l\'ouverture du tiroir-caisse')
              }
            }}>
              {t('openCashDrawer')}
            </Button>

            <Button variant="ghost" onClick={async () => {
              try {
                const status = await window.api.getPrinterStatus()
                alert(`Imprimante ${status.connected ? 'connectée' : 'non connectée'}`)
              } catch (error) {
                alert('Échec de vérification de l\'imprimante')
              }
            }}>
              {t('checkPrinterStatus')}
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
