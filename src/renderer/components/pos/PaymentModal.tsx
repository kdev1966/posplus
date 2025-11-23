import React, { useState, useRef, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useLanguageStore } from '../../store/languageStore'
import { formatCurrency } from '../../utils/currency'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirm: (payments: { method: string; amount: number }[]) => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onConfirm,
}) => {
  const { t } = useLanguageStore()
  const [cashAmount, setCashAmount] = useState(total.toString())
  const cashInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus sur le champ montant en espèces quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Réinitialiser le montant au total à chaque ouverture
      setCashAmount(total.toString())

      // Focus et sélection du champ après un court délai
      setTimeout(() => {
        cashInputRef.current?.focus()
        cashInputRef.current?.select()
      }, 100)
    }
  }, [isOpen, total])

  const cashValue = parseFloat(cashAmount) || 0
  const change = cashValue - total

  const handleConfirm = () => {
    if (cashValue >= total) {
      const payments: { method: string; amount: number }[] = [
        { method: 'cash', amount: total }
      ]

      // Notify customer display of payment completion
      if (window.electron?.ipcRenderer) {
        console.log('[PAYMENT MODAL] Sending payment completion to customer display:', {
          received: cashValue,
        })
        window.electron.ipcRenderer.send('customer-payment-complete', { received: cashValue })
      }

      onConfirm(payments)

      // Réinitialiser pour la prochaine fois
      setCashAmount(total.toString())
    }
  }

  // Permettre la validation avec la touche Entrée
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cashValue >= total) {
      handleConfirm()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('payment')}>
      <div className="space-y-6">
        {/* Montant total à payer */}
        <div className="text-center p-6 glass rounded-lg">
          <p className="text-sm text-gray-400 mb-2">{t('totalAmount')}</p>
          <p className="text-4xl font-bold text-primary-300">{formatCurrency(total)}</p>
        </div>

        {/* Indicateur de mode de paiement en espèces */}
        <div className="flex justify-center">
          <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-500/20">
            <div className="text-4xl mb-2 text-center">💵</div>
            <div className="font-semibold text-center text-primary-300">{t('cash')}</div>
          </div>
        </div>

        {/* Champ de saisie du montant en espèces */}
        <div>
          <Input
            ref={cashInputRef}
            label={t('cashAmount')}
            type="number"
            step="0.001"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.000"
            autoFocus
          />
        </div>

        {/* Affichage de la monnaie à rendre */}
        {cashValue > 0 && (
          <div className="p-4 glass rounded-lg space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>{t('totalPaid')}:</span>
              <span className="font-semibold">{formatCurrency(cashValue)}</span>
            </div>
            {change >= 0 && (
              <div className="flex justify-between text-lg font-bold text-green-300">
                <span>{t('change')}:</span>
                <span>{formatCurrency(change)}</span>
              </div>
            )}
            {change < 0 && (
              <div className="flex justify-between text-lg font-bold text-red-300">
                <span>{t('remaining')}:</span>
                <span>{formatCurrency(Math.abs(change))}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3 mt-6">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {t('cancel')}
        </Button>
        <Button
          variant="success"
          onClick={handleConfirm}
          disabled={cashValue < total}
          className="flex-1"
        >
          {t('confirmPayment')} {cashValue >= total && '(Entrée)'}
        </Button>
      </div>
    </Modal>
  )
}
