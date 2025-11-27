import React, { useState } from 'react'
import { useCartStore } from '../../store/cartStore'
import { useLanguageStore } from '../../store/languageStore'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'

interface CartProps {
  onCheckout: () => void
}

// Helper to get increment step based on unit
const getStepForUnit = (unit: string): number => {
  switch (unit) {
    case 'kg':
    case 'L':
      return 0.1
    default: // pcs
      return 1
  }
}

// Helper to format quantity display based on unit
const formatQuantity = (quantity: number, unit: string): string => {
  if (unit === 'kg' || unit === 'L') {
    return quantity.toFixed(2)
  }
  return quantity.toString()
}

// Helper to get unit label
const getUnitLabel = (unit: string): string => {
  switch (unit) {
    case 'kg':
      return 'kg'
    case 'L':
      return 'L'
    default:
      return ''
  }
}

export const Cart: React.FC<CartProps> = ({ onCheckout }) => {
  const { items, subtotal, discount, total, removeItem, updateQuantity } = useCartStore()
  const { t } = useLanguageStore()
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null)
  const [tempQuantity, setTempQuantity] = useState<string>('')

  const handleQuantityChange = (productId: number, newQuantity: number, unit: string) => {
    // Round to appropriate precision
    const rounded = unit === 'pcs' ? Math.round(newQuantity) : Math.round(newQuantity * 100) / 100
    if (rounded > 0) {
      updateQuantity(productId, rounded)
    } else {
      removeItem(productId)
    }
  }

  const handleQuantityInputStart = (productId: number, currentQuantity: number, unit: string) => {
    setEditingQuantity(productId)
    setTempQuantity(formatQuantity(currentQuantity, unit))
  }

  const handleQuantityInputEnd = (productId: number, unit: string) => {
    const parsed = parseFloat(tempQuantity)
    if (!isNaN(parsed) && parsed > 0) {
      handleQuantityChange(productId, parsed, unit)
    }
    setEditingQuantity(null)
    setTempQuantity('')
  }

  const handleQuantityKeyDown = (e: React.KeyboardEvent, productId: number, unit: string) => {
    if (e.key === 'Enter') {
      handleQuantityInputEnd(productId, unit)
    } else if (e.key === 'Escape') {
      setEditingQuantity(null)
      setTempQuantity('')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">{t('cart')}</h2>
        <p className="text-sm text-gray-400">{items.length} {t('items')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-400">{t('cartEmpty')}</p>
          </div>
        ) : (
          items.map((item) => {
            const unit = item.product.unit || 'pcs'
            const step = getStepForUnit(unit)
            const unitLabel = getUnitLabel(unit)
            const isEditing = editingQuantity === item.product.id

            return (
              <div key={item.product.id} className="cart-item">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{item.product.name}</h3>
                  <p className="text-sm text-gray-400">
                    {formatCurrency(item.product.price)}{unitLabel ? ` / ${unitLabel}` : ''}
                  </p>
                  {item.discountRate > 0 && (
                    <p className="text-xs text-green-400">
                      {t('remise')}: {(item.discountRate * 100).toFixed(0)}%
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity - step, unit)}
                      className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                    >
                      -
                    </button>
                    {isEditing ? (
                      <input
                        type="number"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(e.target.value)}
                        onBlur={() => handleQuantityInputEnd(item.product.id, unit)}
                        onKeyDown={(e) => handleQuantityKeyDown(e, item.product.id, unit)}
                        step={step}
                        min={step}
                        className="w-16 text-center font-semibold bg-gray-800 border border-primary-500 rounded px-1 py-0.5 text-white"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => handleQuantityInputStart(item.product.id, item.quantity, unit)}
                        className="w-16 text-center font-semibold hover:bg-gray-700 rounded px-1 py-0.5"
                        title={t('clickToEdit')}
                      >
                        {formatQuantity(item.quantity, unit)}{unitLabel ? ` ${unitLabel}` : ''}
                      </button>
                    )}
                    <button
                      onClick={() => handleQuantityChange(item.product.id, item.quantity + step, unit)}
                      className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-primary-300">
                    {formatCurrency(item.total)}
                  </p>
                  {item.discount > 0 && (
                    <p className="text-xs text-green-400">
                      -{formatCurrency(item.discount)}
                    </p>
                  )}
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-sm text-red-400 hover:text-red-300 mt-1"
                  >
                    {t('remove')}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-gray-400">
            <span>{t('subtotal')}:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>{t('discount')}:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
            <span>{t('total')}:</span>
            <span className="text-primary-300">{formatCurrency(total)}</span>
          </div>
        </div>

        <Button
          variant="success"
          className="w-full text-lg py-3"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          {t('checkout')}
        </Button>
      </div>
    </div>
  )
}
