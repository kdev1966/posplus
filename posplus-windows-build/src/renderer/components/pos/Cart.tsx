import React from 'react'
import { useCartStore } from '../../store/cartStore'
import { useLanguageStore } from '../../store/languageStore'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../utils/currency'

interface CartProps {
  onCheckout: () => void
}

export const Cart: React.FC<CartProps> = ({ onCheckout }) => {
  const { items, subtotal, discount, total, removeItem, updateQuantity } = useCartStore()
  const { t } = useLanguageStore()

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
          items.map((item) => (
            <div key={item.product.id} className="cart-item">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{item.product.name}</h3>
                <p className="text-sm text-gray-400">{formatCurrency(item.product.price)}</p>
                {item.discountRate > 0 && (
                  <p className="text-xs text-green-400">
                    {t('remise')}: {(item.discountRate * 100).toFixed(0)}%
                  </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
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
          ))
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
