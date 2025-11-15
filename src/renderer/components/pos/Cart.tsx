import React from 'react'
import { useCartStore } from '../../store/cartStore'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface CartProps {
  onCheckout: () => void
}

export const Cart: React.FC<CartProps> = ({ onCheckout }) => {
  const { items, subtotal, tax, discount, total, removeItem, updateQuantity } = useCartStore()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white">Cart</h2>
        <p className="text-sm text-gray-400">{items.length} items</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-400">Cart is empty</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product.id} className="cart-item">
              <div className="flex-1">
                <h3 className="font-semibold text-white">{item.product.name}</h3>
                <p className="text-sm text-gray-400">€{item.product.price.toFixed(2)}</p>

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
                  €{item.total.toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-sm text-red-400 hover:text-red-300 mt-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal:</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Tax:</span>
            <span>€{tax.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Discount:</span>
              <span>-€{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
            <span>Total:</span>
            <span className="text-primary-300">€{total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          variant="success"
          className="w-full text-lg py-3"
          onClick={onCheckout}
          disabled={items.length === 0}
        >
          Checkout
        </Button>
      </div>
    </div>
  )
}
