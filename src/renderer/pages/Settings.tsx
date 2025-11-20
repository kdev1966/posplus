import React, { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { SessionCloseModal } from '../components/session/SessionCloseModal'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const Settings: React.FC = () => {
  const { user } = useAuthStore()
  const { currentSession, isSessionOpen, openSession, closeSession, fetchCurrentSession } = useSessionStore()
  const { t, currentLanguage, setLanguage } = useLanguageStore()

  const [openingCash, setOpeningCash] = useState('0.000')
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [p2pStatus, setP2pStatus] = useState<{
    serverRunning: boolean
    connectedPeers: number
    totalPeers: number
    enabled: boolean
    posId: string
    posName: string
    peers: Array<{
      id: string
      name: string
      address: string
      online: boolean
      lastSeen: Date
    }>
  }>({
    serverRunning: false,
    connectedPeers: 0,
    totalPeers: 0,
    enabled: false,
    posId: '',
    posName: '',
    peers: []
  })

  // Fetch current session on component mount
  useEffect(() => {
    fetchCurrentSession()
    fetchP2PStatus()

    // Actualiser P2P status toutes les 10 secondes
    const interval = setInterval(fetchP2PStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchP2PStatus = async () => {
    try {
      const status = await window.api.getP2PStatus()
      if (status && !status.error) {
        setP2pStatus(status)
      }
    } catch (error) {
      console.error('Failed to fetch P2P status:', error)
    }
  }

  const handleOpenSession = async () => {
    if (!user) return

    const amount = parseFloat(openingCash)
    if (isNaN(amount) || amount < 0) {
      alert(t('error'))
      return
    }

    try {
      await openSession(user.id, amount)
      alert(t('sessionOpenedSuccess'))
    } catch (error: any) {
      const errorMsg = error?.message || t('openSessionFailed')
      alert(`${t('error')}: ${errorMsg}`)
      console.error('Error opening session:', error)
    }
  }

  const handleOpenCloseModal = () => {
    if (!currentSession) return
    setIsCloseModalOpen(true)
  }

  const handleCloseSessionConfirm = async (closingCash: number) => {
    if (!currentSession) return

    try {
      await closeSession(currentSession.id, closingCash)
      setIsCloseModalOpen(false)
      alert(t('sessionClosedSuccess'))
    } catch (error: any) {
      const errorMsg = error?.message || t('closeSessionFailed')
      alert(`${t('error')}: ${errorMsg}`)
      console.error('Error closing session:', error)
      throw error
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

  const handleRepairPayments = async () => {
    if (!confirm(t('repairConfirm'))) {
      return
    }

    setIsRepairing(true)
    try {
      const result = await window.api.repairTicketPayments()

      if (result.errors.length > 0) {
        alert(`${t('repairError')}: ${result.errors.join(', ')}`)
      } else if (result.fixed > 0) {
        alert(`✅ ${t('repairSuccess')}\n\n${result.fixed} ${t('ticketsRepaired')}.\n\n${t('paymentsRecalculated')}`)

        // Refresh current session to update stats
        await fetchCurrentSession()
      } else {
        alert(`✅ ${t('noIssuesFound')}\n\n${t('allPaymentsMatch')}`)
      }
    } catch (error: any) {
      alert(`${t('error')}: ${error?.message || t('repairError')}`)
      console.error('Error repairing payments:', error)
    }
    setIsRepairing(false)
  }

  const handleCreateBackup = async () => {
    if (!confirm(t('backupConfirm'))) {
      return
    }

    setIsBackingUp(true)
    try {
      const result = await window.api.createBackup()

      if (result.success && result.filePath) {
        alert(`✅ ${t('backupSuccess')}\n\n${t('backupSavedTo')}: ${result.filePath}`)
      } else if (result.error === 'Backup canceled') {
        alert(t('backupCancelled'))
      } else {
        alert(`${t('backupError')}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`${t('backupError')}: ${error?.message || 'Unknown error'}`)
      console.error('Error creating backup:', error)
    }
    setIsBackingUp(false)
  }

  const handleRestoreBackup = async () => {
    if (!confirm(t('restoreConfirm'))) {
      return
    }

    setIsRestoring(true)
    try {
      const result = await window.api.restoreBackup()

      if (result.success && result.needsRestart) {
        alert(`✅ ${t('restoreSuccess')}\n\n${t('restartRequired')}`)
        // App will restart automatically after 2 seconds
      } else if (result.error === 'Restore canceled') {
        alert(t('restoreCancelled'))
      } else {
        alert(`${t('restoreError')}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`${t('restoreError')}: ${error?.message || 'Unknown error'}`)
      console.error('Error restoring backup:', error)
    }
    setIsRestoring(false)
  }

  const handleGenerateTemplate = async () => {
    setIsGeneratingTemplate(true)
    try {
      const result = await window.api.generateExcelTemplate()

      if (result.success && result.filePath) {
        alert(`✅ ${t('templateSuccess')}\n\n${t('templateSavedTo')}: ${result.filePath}`)
      } else if (result.error === 'Template download canceled') {
        alert(t('templateCancelled'))
      } else {
        alert(`${t('templateError')}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`${t('templateError')}: ${error?.message || 'Unknown error'}`)
      console.error('Error generating template:', error)
    }
    setIsGeneratingTemplate(false)
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const result = await window.api.exportToExcel()

      if (result.success && result.filePath) {
        alert(`✅ ${t('exportSuccess')}\n\n${t('templateSavedTo')}: ${result.filePath}`)
      } else if (result.error === 'Export canceled') {
        alert(t('exportCancelled'))
      } else {
        alert(`${t('exportError')}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`${t('exportError')}: ${error?.message || 'Unknown error'}`)
      console.error('Error exporting data:', error)
    }
    setIsExporting(false)
  }

  const handleImportData = async () => {
    if (!confirm('⚠️ L\'import va créer ou mettre à jour les catégories et produits. Voulez-vous continuer ?')) {
      return
    }

    setIsImporting(true)
    try {
      const result = await window.api.importFromExcel()

      if (result.success) {
        let message = `✅ ${t('importSuccess')}\n\n`
        message += `${t('categoriesImported')}: ${result.categoriesImported || 0}\n`
        message += `${t('productsImported')}: ${result.productsImported || 0}\n`

        if (result.errors && result.errors.length > 0) {
          message += `\n⚠️ ${t('importErrors')}: ${result.errors.length}\n\n`
          message += result.errors.slice(0, 10).join('\n')
          if (result.errors.length > 10) {
            message += `\n... et ${result.errors.length - 10} autres erreurs`
          }
        }

        alert(message)
      } else if (result.error === 'Import canceled') {
        alert(t('importCancelled'))
      } else {
        alert(`${t('importError')}: ${result.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`${t('importError')}: ${error?.message || 'Unknown error'}`)
      console.error('Error importing data:', error)
    }
    setIsImporting(false)
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
          <h2 className="text-xl font-bold text-white mb-4">{t('languageSettings')}</h2>
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
              <div className="font-semibold text-white">{t('french')}</div>
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
              <div className="font-semibold text-white">{t('arabic')}</div>
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
                      {currentSession?.status === 'open' ? t('open') : currentSession?.status === 'closed' ? t('closed') : currentSession?.status || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <Button variant="danger" onClick={handleOpenCloseModal}>
                {t('closeSession')}
              </Button>
            </div>
          )}
        </Card>

        {/* Session Close Modal */}
        {currentSession && (
          <SessionCloseModal
            isOpen={isCloseModalOpen}
            onClose={() => setIsCloseModalOpen(false)}
            session={currentSession}
            onConfirm={handleCloseSessionConfirm}
          />
        )}

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
              <span className="text-white font-semibold">{t('tunisianDinar')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('country')}</span>
              <span className="text-white font-semibold">{t('tunisia')}</span>
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
                alert(t('cashDrawerOpened'))
              } catch (error) {
                alert(t('cashDrawerOpenFailed'))
              }
            }}>
              {t('openCashDrawer')}
            </Button>

            <Button variant="ghost" onClick={async () => {
              try {
                const status = await window.api.getPrinterStatus()
                alert(status.connected ? t('printerConnected') : t('printerNotConnected'))
              } catch (error) {
                alert(t('printerCheckFailed'))
              }
            }}>
              {t('checkPrinterStatus')}
            </Button>
          </div>
        </Card>

        {/* P2P Synchronization Settings */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-4">🔄 Synchronisation P2P</h2>

          <div className="space-y-4">
            {/* Status */}
            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">État du serveur P2P</span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  p2pStatus.serverRunning
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {p2pStatus.serverRunning ? '✓ En ligne' : '✗ Hors ligne'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300 font-medium">Pairs connectés</span>
                <span className="text-blue-400 font-bold text-lg">
                  {p2pStatus.connectedPeers} / {p2pStatus.totalPeers}
                </span>
              </div>

              {p2pStatus.posName && (
                <div className="pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">Nom du POS</div>
                  <div className="text-white font-mono">{p2pStatus.posName}</div>
                </div>
              )}
            </div>

            {/* Peers List */}
            {p2pStatus.peers && p2pStatus.peers.length > 0 && (
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-bold text-white mb-3">Machines découvertes</h3>
                <div className="space-y-2">
                  {p2pStatus.peers.map((peer: any) => (
                    <div key={peer.id} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-0">
                      <div>
                        <div className="text-white font-medium">{peer.name}</div>
                        <div className="text-xs text-gray-400">{peer.address}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-semibold ${
                        peer.online
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {peer.online ? 'En ligne' : 'Hors ligne'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p2pStatus.peers && p2pStatus.peers.length === 0 && (
              <div className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-gray-400 py-4">
                  🔍 Aucune machine découverte sur le réseau
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="primary" onClick={async () => {
                try {
                  await window.api.reconnectP2P()
                  alert('Reconnexion en cours...')
                  setTimeout(fetchP2PStatus, 2000)
                } catch (error) {
                  alert('Échec de la reconnexion')
                }
              }}>
                🔄 Forcer reconnexion
              </Button>

              <Button variant="ghost" onClick={fetchP2PStatus}>
                🔍 Actualiser
              </Button>
            </div>
          </div>
        </Card>

        {/* Maintenance Settings - ADMINISTRATOR ONLY */}
        {user?.roleId === 1 && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">🔧 {t('maintenance')}</h2>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span><strong>{t('maintenanceAdminOnly')}</strong> - {t('maintenanceWarning')}</span>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold mb-2">{t('repairTicketPayments')}</h3>
                <p className="text-gray-400 text-sm mb-3">
                  {t('repairTicketPaymentsDescription')}
                </p>
                <Button
                  variant="primary"
                  onClick={handleRepairPayments}
                  disabled={isRepairing}
                >
                  {isRepairing ? `⏳ ${t('repairingPayments')}` : `🔧 ${t('repairPaymentsButton')}`}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Backup & Restore - ADMINISTRATOR ONLY */}
        {user?.roleId === 1 && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">💾 {t('backupRestore')}</h2>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-400 text-sm flex items-center gap-2">
                <span>ℹ️</span>
                <span><strong>{t('backupRestoreAdminOnly')}</strong> - {t('backupRestoreDescription')}</span>
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="primary"
                  onClick={handleCreateBackup}
                  disabled={isBackingUp || isRestoring}
                >
                  {isBackingUp ? `⏳ ${t('creatingBackup')}` : `💾 ${t('createBackup')}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleRestoreBackup}
                  disabled={isBackingUp || isRestoring}
                >
                  {isRestoring ? `⏳ ${t('restoringBackup')}` : `📥 ${t('restoreBackup')}`}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* CSV Import/Export - ADMINISTRATOR ONLY */}
        {user?.roleId === 1 && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">📊 {t('csvImportExport')}</h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <span>ℹ️</span>
                <span><strong>{t('backupRestoreAdminOnly')}</strong> - {t('csvImportExportDescription')}</span>
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="primary"
                  onClick={handleGenerateTemplate}
                  disabled={isGeneratingTemplate || isExporting || isImporting}
                >
                  {isGeneratingTemplate ? `⏳ ${t('generatingTemplate')}` : `📥 ${t('generateTemplate')}`}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportData}
                  disabled={isGeneratingTemplate || isExporting || isImporting}
                >
                  {isExporting ? `⏳ ${t('exportingData')}` : `📤 ${t('exportData')}`}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleImportData}
                  disabled={isGeneratingTemplate || isExporting || isImporting}
                >
                  {isImporting ? `⏳ ${t('importingData')}` : `📦 ${t('importData')}`}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
