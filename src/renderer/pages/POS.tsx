import React, { useEffect, useState, useRef } from 'react'
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
import { toast } from '../store/toastStore'
import { usePrintPreviewStore } from '../store/printPreviewStore'
import { Product } from '@shared/types'

export const POS: React.FC = () => {
  const { user } = useAuthStore()
  const { currentSession, isSessionOpen } = useSessionStore()
  const { openPreview } = usePrintPreviewStore()
  const { categories, fetchProducts, fetchCategories, getFilteredProducts, setSelectedCategory, setSearchQuery, selectedCategory, searchQuery } = useProductStore()
  const { addItem, total, items, clearCart } = useCartStore()
  const { t, currentLanguage } = useLanguageStore()

  const [showPayment, setShowPayment] = useState(false)
  const [barcode, setBarcode] = useState('')
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Auto-focus sur le champ barcode au chargement de la page
  useEffect(() => {
    setTimeout(() => {
      barcodeInputRef.current?.focus()
    }, 100)
  }, [])

  // Debug: Log categories when they change
  useEffect(() => {
    console.log('[POS] Categories:', categories)
    console.log('[POS] Active categories:', categories.filter(c => c.isActive))
  }, [categories])

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
        toast.warning(t('productNotFound'))
      }
    } catch (error) {
      console.error('Failed to find product:', error)
      toast.error(t('productNotFound'))
    }
  }

  const handleCheckout = () => {
    if (!isSessionOpen) {
      toast.warning(t('pleaseOpenSession'))
      return
    }

    if (items.length === 0) {
      toast.info(t('cartEmpty'))
      return
    }

    setShowPayment(true)
  }

  const handlePaymentConfirm = async (payments: { method: string; amount: number }[]) => {
    if (!currentSession || !user) return

    console.log('[POS] ====== RECEIVED FROM PAYMENT MODAL ======')
    console.log('[POS] payments received:', JSON.stringify(payments))
    console.log('[POS] ===========================================')

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

      console.log('[POS] ticketData.payments:', JSON.stringify(ticketData.payments))

      const ticket = await window.api.createTicket(ticketData)
      console.log('[POS] Ticket created successfully:', ticket.id, ticket.ticketNumber)
      console.log('[POS] Ticket payments from DB:', JSON.stringify(ticket.payments))

      // Print ticket - check if preview is enabled
      let printSucceeded = true
      try {
        console.log('[POS] Attempting to print ticket:', ticket.id)

        // Check if print preview is enabled
        const storeSettings = await window.api.getStoreSettings()
        if (storeSettings.printPreviewEnabled) {
          // Show preview modal
          const previewHtml = await window.api.getTicketPreview(ticket.id, currentLanguage)
          if (previewHtml) {
            openPreview(previewHtml, ticket.id, async () => {
              const result = await window.api.printTicket(ticket.id, currentLanguage)
              if (!result) throw new Error('Print failed')
            })
          }
        } else {
          // Print directly
          const printResult = await window.api.printTicket(ticket.id, currentLanguage)
          console.log('[POS] Print result received:', printResult)
          if (!printResult) {
            console.warn('[POS] Print command returned false for ticket:', ticket.id)
            printSucceeded = false
          } else {
            console.log('[POS] Print command succeeded for ticket:', ticket.id)
          }
        }
      } catch (printError) {
        console.error('[POS] Failed to print ticket:', printError)
        printSucceeded = false
      }

      // Refresh product list to update stock quantities
      await fetchProducts()

      // Clear cart and close modal
      clearCart()
      setShowPayment(false)

      // Clear search fields
      setBarcode('')
      setSearchQuery('')

      // Log result without showing toast to avoid interrupting cashier workflow
      if (printSucceeded) {
        console.log(`[POS] Sale completed successfully - Ticket #${ticket.ticketNumber}`)
        toast.success(`${t('ticket')} #${ticket.ticketNumber} - ${t('saleCompleted')}`, 2000)
      } else {
        console.warn(`[POS] Sale completed but print failed - Ticket #${ticket.ticketNumber}`)
        // Show warning if printing failed (cashier needs to know to reprint manually)
        toast.warning(`${t('ticket')} #${ticket.ticketNumber} - ${t('printFailed')}. ${t('canReprintFromHistory')}`, 6000)
      }

      // Refocus on barcode input after modal closes
      setTimeout(() => {
        barcodeInputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error('Failed to complete sale:', error)
      toast.error(t('failedToCompleteSale'))
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
                ref={barcodeInputRef}
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
