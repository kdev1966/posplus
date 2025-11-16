import React, { useState } from 'react'
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
  const [cardAmount, setCardAmount] = useState('0')
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'card' | 'mixed'>('cash')

  const cashValue = parseFloat(cashAmount) || 0
  const cardValue = parseFloat(cardAmount) || 0
  const totalPaid = cashValue + cardValue
  const change = totalPaid - total

  const handleConfirm = () => {
    const payments: { method: string; amount: number }[] = []

    if (cashValue > 0) {
      payments.push({ method: 'cash', amount: Math.min(cashValue, total) })
    }

    if (cardValue > 0) {
      payments.push({ method: 'card', amount: Math.min(cardValue, total - cashValue) })
    }

    if (payments.length > 0 && totalPaid >= total) {
      onConfirm(payments)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('payment')}>
      <div className="space-y-6">
        <div className="text-center p-6 glass rounded-lg">
          <p className="text-sm text-gray-400 mb-2">{t('totalAmount')}</p>
          <p className="text-4xl font-bold text-primary-300">{formatCurrency(total)}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setSelectedMethod('cash')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              selectedMethod === 'cash'
                ? 'border-primary-500 bg-primary-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">💵</div>
            <div className="font-semibold">{t('cash')}</div>
          </button>

          <button
            onClick={() => setSelectedMethod('card')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              selectedMethod === 'card'
                ? 'border-primary-500 bg-primary-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">💳</div>
            <div className="font-semibold">{t('card')}</div>
          </button>

          <button
            onClick={() => setSelectedMethod('mixed')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              selectedMethod === 'mixed'
                ? 'border-primary-500 bg-primary-500/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="text-3xl mb-2">💰</div>
            <div className="font-semibold">{t('mixed')}</div>
          </button>
        </div>

        {(selectedMethod === 'cash' || selectedMethod === 'mixed') && (
          <Input
            label={t('cashAmount')}
            type="number"
            step="0.001"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            placeholder="0.000"
          />
        )}

        {(selectedMethod === 'card' || selectedMethod === 'mixed') && (
          <Input
            label={t('cardAmount')}
            type="number"
            step="0.001"
            value={cardAmount}
            onChange={(e) => setCardAmount(e.target.value)}
            placeholder="0.000"
          />
        )}

        {totalPaid > 0 && (
          <div className="p-4 glass rounded-lg space-y-2">
            <div className="flex justify-between text-gray-400">
              <span>{t('totalPaid')}:</span>
              <span className="font-semibold">{formatCurrency(totalPaid)}</span>
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

      <div className="flex gap-3 mt-6">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          {t('cancel')}
        </Button>
        <Button
          variant="success"
          onClick={handleConfirm}
          disabled={totalPaid < total}
          className="flex-1"
        >
          {t('confirmPayment')}
        </Button>
      </div>
    </Modal>
  )
}
