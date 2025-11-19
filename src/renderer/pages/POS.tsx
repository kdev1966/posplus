import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { ProductGrid } from '../components/pos/ProductGrid'
import { Cart } from '../components/pos/Cart'
import { PaymentModal } from '../components/pos/PaymentModal'
import { Input } from '../components/ui/Input'
import { useProductStore } from '../store/productStore'
import { useCartStore } from '../store/cartStore'
import { useSessionStore } from '../store/sessionStore'
import { useAuthStore } from '../store/authStore'
import { useLanguageStore } from '../store/languageStore'
import { Product } from '@shared/types'

export const POS: React.FC = () => {
  const { user } = useAuthStore()
  const { currentSession, isSessionOpen } = useSessionStore()
  const { categories, fetchProducts, fetchCategories, getFilteredProducts, setSelectedCategory, setSearchQuery, selectedCategory, searchQuery } = useProductStore()
  const { addItem, total, items, clearCart } = useCartStore()
  const { t } = useLanguageStore()

  const [showPayment, setShowPayment] = useState(false)
  const [barcode, setBarcode] = useState('')

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const handleProductClick = (product: Product) => {
    if (product.stock > 0) {
      addItem(product, 1)
    }
  }

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode.trim()) return

    try {
      const product = await window.api.getProductByBarcode(barcode)
      if (product && product.stock > 0) {
        addItem(product, 1)
        setBarcode('')
        setSearchQuery('')
      } else {
        alert(t('productNotFound'))
      }
    } catch (error) {
      console.error('Failed to find product:', error)
      alert(t('productNotFound'))
    }
  }

  const handleCheckout = () => {
    if (!isSessionOpen) {
      alert(t('pleaseOpenSession'))
      return
    }

    if (items.length === 0) {
      alert(t('cartEmpty'))
      return
    }

    setShowPayment(true)
  }

  const handlePaymentConfirm = async (payments: { method: string; amount: number }[]) => {
    if (!currentSession || !user) return

    try {
      // Create ticket
      const ticketData = {
        userId: user.id,
        sessionId: currentSession.id,
        lines: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          discountAmount: item.discount,
        })),
        payments: payments.map(p => ({
          method: p.method as any,
          amount: p.amount,
        })),
      }

      const ticket = await window.api.createTicket(ticketData)

      // Print ticket
      await window.api.printTicket(ticket.id)

      // Refresh product list to update stock quantities
      await fetchProducts()

      // Clear cart and close modal
      clearCart()
      setShowPayment(false)

      alert(`${t('saleCompleted')} - ${t('ticket')} #${ticket.ticketNumber}`)
    } catch (error) {
      console.error('Failed to complete sale:', error)
      alert(t('failedToCompleteSale'))
    }
  }

  const filteredProducts = getFilteredProducts()

  if (!isSessionOpen) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">{t('noActiveSession')}</h2>
            <p className="text-gray-400 mb-6">{t('pleaseOpenSession')}</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="h-full flex gap-6 fade-in">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Filters */}
          <div className="mb-4 space-y-3">
            <form onSubmit={handleBarcodeSubmit}>
              <Input
                placeholder={t('scanBarcode')}
                value={barcode || searchQuery}
                onChange={(e) => {
                  setBarcode(e.target.value)
                  setSearchQuery(e.target.value)
                }}
                autoFocus
              />
            </form>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === null
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {t('allProducts')}
              </button>
              {categories.filter(c => c.isActive).map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-auto">
            <ProductGrid products={filteredProducts} onProductClick={handleProductClick} />
          </div>
        </div>

        {/* Cart Section */}
        <div className="w-96 glass rounded-xl overflow-hidden">
          <Cart onCheckout={handleCheckout} />
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        onConfirm={handlePaymentConfirm}
      />
    </Layout>
  )
}
