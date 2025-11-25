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

  const [printerName, setPrinterName] = useState('POS80 Printer')
  const [printerPort, setPrinterPort] = useState('CP001')
  const [printerStatus, setPrinterStatus] = useState<{ connected: boolean; ready: boolean; error?: string | null } | null>(null)
  const [isCheckingPrinter, setIsCheckingPrinter] = useState(false)

  const [openingCash, setOpeningCash] = useState('0.000')
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [testTicketPreview, setTestTicketPreview] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
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

  // Store settings state
  const [storeNameFr, setStoreNameFr] = useState('')
  const [storeNameAr, setStoreNameAr] = useState('')
  const [storePhone, setStorePhone] = useState('')
  const [ticketMessageFr, setTicketMessageFr] = useState('')
  const [ticketMessageAr, setTicketMessageAr] = useState('')
  const [printPreviewEnabled, setPrintPreviewEnabled] = useState(false)
  const [isSavingStoreSettings, setIsSavingStoreSettings] = useState(false)

  // Fetch current session on component mount
  useEffect(() => {
    fetchCurrentSession()
    fetchP2PStatus()
    fetchPrinterConfig()
    fetchStoreSettings()
    // Actualiser P2P status toutes les 10 secondes
    const interval = setInterval(fetchP2PStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const fetchStoreSettings = async () => {
    try {
      const settings = await window.api.getStoreSettings()
      setStoreNameFr(settings.storeNameFr)
      setStoreNameAr(settings.storeNameAr)
      setStorePhone(settings.storePhone)
      setTicketMessageFr(settings.ticketMessageFr)
      setTicketMessageAr(settings.ticketMessageAr)
      setPrintPreviewEnabled(settings.printPreviewEnabled || false)
    } catch (error) {
      console.error('Failed to fetch store settings:', error)
    }
  }

  const handleSaveStoreSettings = async () => {
    setIsSavingStoreSettings(true)
    try {
      await window.api.updateStoreSettings({
        storeNameFr,
        storeNameAr,
        storePhone,
        ticketMessageFr,
        ticketMessageAr,
        printPreviewEnabled,
      })
      alert(currentLanguage === 'fr' ?
        '✅ Paramètres du magasin enregistrés avec succès!' :
        '✅ تم حفظ إعدادات المتجر بنجاح!')
    } catch (error) {
      console.error('Failed to save store settings:', error)
      alert(currentLanguage === 'fr' ?
        '❌ Erreur lors de l\'enregistrement des paramètres' :
        '❌ خطأ في حفظ الإعدادات')
    } finally {
      setIsSavingStoreSettings(false)
    }
  }

  const fetchPrinterConfig = async () => {
    try {
      const cfg = await window.api.getPrinterConfig()
      if (cfg) {
        setPrinterName(cfg.printerName || 'POS80 Printer')
        setPrinterPort(cfg.port || 'CP001')
      }
    } catch (error) {
      console.error('Failed to fetch printer config:', error)
    }
  }

  const checkPrinterStatus = async (showAlert = false) => {
    setIsCheckingPrinter(true)
    try {
      const status = await window.api.getPrinterStatus()
      console.log('[SETTINGS] Printer status received:', status)
      setPrinterStatus(status)
      if (showAlert) {
        if (status.connected) {
          if (status.error) {
            alert(`${t('printerConnected')}\n\n⚠️ Erreur: ${status.error}`)
          } else {
            alert(t('printerConnected'))
          }
        } else {
          alert(`${t('printerNotConnected')}${status.error ? '\n\nErreur: ' + status.error : ''}`)
        }
      }
    } catch (error) {
      console.error('[SETTINGS] Failed to check printer status:', error)
      if (showAlert) alert(t('printerCheckFailed'))
    } finally {
      setIsCheckingPrinter(false)
    }
  }

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nom de l'imprimante"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="POS80 Printer"
              />
              <Input
                label="Port"
                value={printerPort}
                onChange={(e) => setPrinterPort(e.target.value)}
                placeholder="CP001"
              />
            </div>

            <div className="flex gap-3 items-center">
              <Button variant="primary" onClick={async () => {
                try {
                  const ok = await window.api.setPrinterConfig({ printerName, port: printerPort })
                  if (ok) {
                    await window.api.reconnectPrinter()
                    alert('✅ Configuration enregistrée et tentative de reconnexion lancée')
                    checkPrinterStatus()
                  } else {
                    alert('❌ Échec de la sauvegarde de la configuration')
                  }
                } catch (error) {
                  alert('❌ Erreur lors de la sauvegarde de la configuration')
                }
              }}>
                Enregistrer la configuration
              </Button>

              <div className="ml-2 inline-flex items-center gap-3">
                <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-semibold ${printerStatus?.connected ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                  {printerStatus ? (printerStatus.connected ? t('printerConnected') : t('printerNotConnected')) : '—'}
                </div>
                <div className="text-xs text-gray-400">{printerStatus?.error ?? ''}</div>
                <Button variant="ghost" onClick={() => checkPrinterStatus(true)} disabled={isCheckingPrinter}>
                  {isCheckingPrinter ? '⏳' : t('checkPrinterStatus')}
                </Button>
              </div>
            </div>

            {/* Print Preview Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={printPreviewEnabled}
                onChange={async (e) => {
                  const newValue = e.target.checked
                  setPrintPreviewEnabled(newValue)
                  try {
                    await window.api.updateStoreSettings({ printPreviewEnabled: newValue })
                  } catch (error) {
                    console.error('Failed to save print preview setting:', error)
                  }
                }}
                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-800"
              />
              <span className="text-gray-300">
                {currentLanguage === 'fr' ? 'Aperçu avant impression' : 'معاينة قبل الطباعة'}
              </span>
            </label>

            <div className="flex gap-3 flex-wrap">
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

              <Button variant="secondary" onClick={async () => {
              setIsLoadingPreview(true)
              try {
                const html = await window.api.getTestTicketPreview()
                setTestTicketPreview(html)
              } catch (error) {
                console.error('[SETTINGS] Preview error:', error)
                alert('❌ Erreur lors du chargement de l\'aperçu')
              } finally {
                setIsLoadingPreview(false)
              }
            }} disabled={isLoadingPreview}>
              {isLoadingPreview ? '⏳' : '🖨️'} Ticket de test
            </Button>
            </div>
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
            <div className="flex gap-3 flex-wrap">
              <Button variant="success" onClick={async () => {
                try {
                  const result = await window.api.syncP2PNow()
                  if (result.success) {
                    alert(`✅ Synchronisation manuelle réussie!\n\n${result.categoriesSynced} catégories et ${result.productsSynced} produits ont été envoyés aux pairs connectés.`)
                  } else {
                    alert(`❌ Erreur de synchronisation: ${result.error || 'Erreur inconnue'}`)
                  }
                } catch (error: any) {
                  alert(`❌ Erreur: ${error?.message || 'Échec de la synchronisation'}`)
                }
              }}>
                📤 Synchroniser maintenant
              </Button>

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

        {/* Store Settings - ADMINISTRATOR ONLY */}
        {user?.roleId === 1 && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-4">
              🏪 {currentLanguage === 'fr' ? 'Informations du Magasin' : 'معلومات المتجر'}
            </h2>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-400 text-sm flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  {currentLanguage === 'fr'
                    ? 'Ces informations apparaîtront sur les tickets imprimés'
                    : 'ستظهر هذه المعلومات على التذاكر المطبوعة'}
                </span>
              </p>
            </div>

            <div className="space-y-6">
              {/* Store Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    {currentLanguage === 'fr' ? 'Nom du magasin (Français)' : 'اسم المتجر (فرنسي)'}
                  </label>
                  <Input
                    value={storeNameFr}
                    onChange={(e) => setStoreNameFr(e.target.value)}
                    placeholder={currentLanguage === 'fr' ? 'Mon Super Magasin' : 'اسم المتجر بالفرنسية'}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    {currentLanguage === 'fr' ? 'Nom du magasin (Arabe)' : 'اسم المتجر (عربي)'}
                  </label>
                  <Input
                    value={storeNameAr}
                    onChange={(e) => setStoreNameAr(e.target.value)}
                    placeholder={currentLanguage === 'fr' ? 'اسم المتجر' : 'اسم المتجر بالعربية'}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Store Phone */}
              <div>
                <label className="block text-gray-300 mb-2 font-medium">
                  {currentLanguage === 'fr' ? 'Numéro de téléphone' : 'رقم الهاتف'}
                </label>
                <Input
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder={currentLanguage === 'fr' ? '0123456789' : '٠١٢٣٤٥٦٧٨٩'}
                />
              </div>

              {/* Ticket Messages */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    {currentLanguage === 'fr' ? 'Message du ticket (Français)' : 'رسالة التذكرة (فرنسي)'}
                  </label>
                  <textarea
                    value={ticketMessageFr}
                    onChange={(e) => setTicketMessageFr(e.target.value)}
                    placeholder={currentLanguage === 'fr' ? 'Merci de votre visite!' : 'رسالة بالفرنسية'}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">
                    {currentLanguage === 'fr' ? 'Message du ticket (Arabe)' : 'رسالة التذكرة (عربي)'}
                  </label>
                  <textarea
                    value={ticketMessageAr}
                    onChange={(e) => setTicketMessageAr(e.target.value)}
                    placeholder={currentLanguage === 'fr' ? 'شكرا لزيارتكم!' : 'رسالة بالعربية'}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                    rows={3}
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  variant="success"
                  onClick={handleSaveStoreSettings}
                  disabled={isSavingStoreSettings}
                >
                  {isSavingStoreSettings
                    ? (currentLanguage === 'fr' ? '⏳ Enregistrement...' : '⏳ جاري الحفظ...')
                    : (currentLanguage === 'fr' ? '💾 Enregistrer' : '💾 حفظ')}
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

        {/* Test Ticket Preview Modal */}
        {testTicketPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">Aperçu du ticket de test</h3>
                <button
                  onClick={() => setTestTicketPreview(null)}
                  className="text-gray-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 flex justify-center">
                <div className="bg-white rounded shadow-lg" style={{ width: '72mm' }}>
                  <iframe
                    srcDoc={testTicketPreview}
                    style={{ width: '72mm', height: '400px', border: 'none' }}
                    title="Aperçu ticket"
                  />
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-700">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setTestTicketPreview(null)}
                >
                  Fermer
                </Button>
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={async () => {
                    try {
                      const result = await window.api.printTestTicket()
                      if (result) {
                        setTestTicketPreview(null)
                      } else {
                        alert('❌ Échec de l\'impression')
                      }
                    } catch (error) {
                      alert('❌ Erreur: ' + (error as Error).message)
                    }
                  }}
                >
                  🖨️ Imprimer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
