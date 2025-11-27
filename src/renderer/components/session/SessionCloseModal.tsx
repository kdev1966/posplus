import React, { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CashSession } from '@shared/types'
import { useLanguageStore } from '../../store/languageStore'
import { formatCurrency } from '../../utils/currency'
import { toast } from '../../store/toastStore'
import { usePrintPreviewStore } from '../../store/printPreviewStore'

interface SessionCloseModalProps {
  isOpen: boolean
  onClose: () => void
  session: CashSession
  onConfirm: (closingCash: number) => Promise<void>
}

interface SessionStats {
  ticket_count: number
  total_sales: number
  total_cash: number
  total_card: number
  total_transfer: number
  total_check: number
  total_other: number
}

export const SessionCloseModal: React.FC<SessionCloseModalProps> = ({
  isOpen,
  onClose,
  session,
  onConfirm
}) => {
  const { t, currentLanguage } = useLanguageStore()
  const { openPreview } = usePrintPreviewStore()
  const [closingCash, setClosingCash] = useState('0.000')
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (isOpen && session) {
      loadSessionStats()
    }
  }, [isOpen, session])

  const loadSessionStats = async () => {
    setLoading(true)
    try {
      const sessionStats = await window.api.getSessionStats(session.id)
      setStats(sessionStats)
    } catch (error) {
      console.error('Failed to load session stats:', error)
    }
    setLoading(false)
  }

  const handleConfirm = async () => {
    const amount = parseFloat(closingCash)
    if (isNaN(amount) || amount < 0) {
      toast.error(t('error'))
      return
    }

    try {
      await onConfirm(amount)
      toast.success(t('sessionClosedSuccess'))
      onClose()
    } catch (error) {
      // Error is handled by parent component
    }
  }

  const handlePrintAndClose = async () => {
    setPrinting(true)
    try {
      // Validate closing cash amount
      const amount = parseFloat(closingCash)
      if (isNaN(amount) || amount < 0) {
        toast.error(t('error'))
        setPrinting(false)
        return
      }

      // 1. Close session FIRST (required before generating Z Report)
      await onConfirm(amount)

      // 2. Generate Z Report data AFTER session is closed
      try {
        await window.api.generateZReport(session.id)
      } catch (genError) {
        console.error('Failed to generate Z report:', genError)
        toast.warning(t('sessionClosedPrintFailed'), 6000)
        onClose()
        setPrinting(false)
        return
      }

      // 3. Check if print preview is enabled
      const storeSettings = await window.api.getStoreSettings()
      if (storeSettings.printPreviewEnabled) {
        // Show preview modal - close this modal first, then show preview
        try {
          const previewHtml = await window.api.getZReportPreview(session.id, currentLanguage)
          if (previewHtml && previewHtml.length > 0) {
            onClose()
            openPreview(previewHtml, session.id, async () => {
              const result = await window.api.printZReport(session.id, currentLanguage)
              if (!result.success) throw new Error(result.error || 'Print failed')
            })
            toast.success(t('sessionClosedAndPrinted'))
          } else {
            console.error('Z Report preview HTML is empty')
            toast.warning(t('sessionClosedPrintFailed'), 6000)
            onClose()
          }
        } catch (previewError) {
          console.error('Failed to get Z Report preview:', previewError)
          toast.warning(t('sessionClosedPrintFailed'), 6000)
          onClose()
        }
      } else {
        // Print directly without preview
        const result = await window.api.printZReport(session.id, currentLanguage)
        if (result.success) {
          toast.success(t('sessionClosedAndPrinted'))
        } else {
          console.error('Z Report print failed:', result.error)
          toast.warning(t('sessionClosedPrintFailed'), 6000)
        }
        onClose()
      }
    } catch (error) {
      console.error('Failed to close session:', error)
      toast.error(t('error'))
    }
    setPrinting(false)
  }

  const expectedCash = stats
    ? session.openingCash + stats.total_sales
    : session.openingCash

  const difference = parseFloat(closingCash) - expectedCash

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('closeSession')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={loading || printing}
          >
            {t('closeSessionOnly')}
          </Button>
          <Button
            variant="success"
            onClick={handlePrintAndClose}
            disabled={loading || printing}
          >
            {printing ? t('printing') : t('closeAndPrint')}
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="spinner" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">{t('sessionInformation')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">{t('startedAt')}</p>
                <p className="text-white font-medium">
                  {new Date(session.startedAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">{t('openingCash')}</p>
                <p className="text-white font-medium">
                  {formatCurrency(session.openingCash)}
                </p>
              </div>
            </div>
          </div>

          {/* Sales Summary */}
          {stats && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">{t('salesSummary')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('totalTickets')}</span>
                  <span className="text-white font-medium">{stats.ticket_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('totalSales')}</span>
                  <span className="text-primary-300 font-medium text-lg">
                    {formatCurrency(stats.total_sales)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods Breakdown */}
          {stats && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">{t('paymentMethods')}</h3>
              <div className="space-y-2">
                {stats.total_cash > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('cash')}</span>
                    <span className="text-white">{formatCurrency(stats.total_cash)}</span>
                  </div>
                )}
                {stats.total_card > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('card')}</span>
                    <span className="text-white">{formatCurrency(stats.total_card)}</span>
                  </div>
                )}
                {stats.total_transfer > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('bankTransfer')}</span>
                    <span className="text-white">{formatCurrency(stats.total_transfer)}</span>
                  </div>
                )}
                {stats.total_check > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('check')}</span>
                    <span className="text-white">{formatCurrency(stats.total_check)}</span>
                  </div>
                )}
                {stats.total_other > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('other')}</span>
                    <span className="text-white">{formatCurrency(stats.total_other)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cash Count */}
          <div className="bg-dark-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3">{t('cashCount')}</h3>
            <Input
              label={`${t('closingCash')} (DT)`}
              type="number"
              step="0.001"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              placeholder="0.000"
            />
          </div>

          {/* Expected vs Actual */}
          {closingCash && stats && (
            <div className="bg-dark-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">{t('cashReconciliation')}</h3>
              <div className="space-y-3">
                {/* Calcul détaillé du cash attendu */}
                <div className="bg-dark-600 rounded p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('openingCash')}</span>
                    <span className="text-gray-300">{formatCurrency(session.openingCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">+ {t('totalSales')}</span>
                    <span className="text-green-300">{formatCurrency(stats.total_sales)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-500 pt-2 font-medium">
                    <span className="text-white">= {t('expectedCash')}</span>
                    <span className="text-white">{formatCurrency(expectedCash)}</span>
                  </div>
                </div>

                {/* Note explicative sur le calcul */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
                  <p className="text-xs text-blue-300">
                    ℹ️ {t('expectedCashNote')}
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <span className="text-gray-400">{t('actualCash')}</span>
                  <span className="text-white font-medium">
                    {formatCurrency(parseFloat(closingCash) || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dark-600 pt-3">
                  <span className="text-white font-semibold">{t('difference')}</span>
                  <span className={`font-bold text-lg ${
                    Math.abs(difference) < 0.001
                      ? 'text-green-400'
                      : difference > 0
                      ? 'text-blue-400'
                      : 'text-red-400'
                  }`}>
                    {difference >= 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
