import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getTranslation, type Language } from '../i18n/translations'

interface CustomerCartItem {
  nom: string
  quantite: number
  prix: number
  total: number
}

export const CustomerDisplay: React.FC = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('fr')
  const [cart, setCart] = useState<CustomerCartItem[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [amountReceived, setAmountReceived] = useState<number | null>(null)

  // Translation helper
  const t = (key: string) => getTranslation(currentLanguage, key as any)

  // Update document direction for RTL support
  useEffect(() => {
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = currentLanguage
  }, [currentLanguage])

  useEffect(() => {
    // Listen for cart updates from main process
    if (window.electron?.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on(
        'customer-cart-updated',
        (newCart: CustomerCartItem[]) => {
          console.log('[CUSTOMER DISPLAY] Cart updated:', newCart)
          setCart(newCart || [])
          setIsPaid(false)
          setAmountReceived(null)
        }
      )

      // Listen for payment completion
      const unsubscribePayment = window.electron.ipcRenderer.on(
        'customer-payment-complete',
        (data: { received: number }) => {
          console.log('[CUSTOMER DISPLAY] Payment complete:', data)
          setIsPaid(true)
          setAmountReceived(data.received)
        }
      )

      // Listen for language changes
      const unsubscribeLanguage = window.electron.ipcRenderer.on(
        'customer-language-changed',
        (language: Language) => {
          console.log('[CUSTOMER DISPLAY] Language changed:', language)
          setCurrentLanguage(language)
        }
      )

      return () => {
        unsubscribe()
        unsubscribePayment()
        unsubscribeLanguage()
      }
    }
  }, [])

  const total = cart.reduce((sum, item) => sum + item.total, 0)
  const change = amountReceived !== null ? amountReceived - total : 0

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="w-full max-w-6xl h-full flex flex-col lg:flex-row gap-6">
        {/* Left side - Cart items */}
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {cart.length === 0 || isPaid ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-12 text-center"
              >
                <div className="mb-8">
                  <div className="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center border-2 border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.3)]">
                    <span className="text-6xl font-black text-white/90 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                      POS+
                    </span>
                  </div>
                </div>
                <h2 className="text-5xl font-bold text-white/90 mb-4 drop-shadow-lg">
                  {t('customerDisplayWelcome')}
                </h2>
                <p className="text-2xl text-white/60">
                  {t('customerDisplaySubtitle')}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="cart"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
              >
                {cart.map((item, index) => (
                  <motion.div
                    key={`${item.nom}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-5 flex justify-between items-center shadow-lg hover:bg-white/10 transition-all"
                  >
                    <div className="flex-1">
                      <div className="text-2xl font-semibold text-white/95 mb-1">
                        {item.nom}
                      </div>
                      <div className="text-lg text-cyan-300/80">
                        {item.quantite} × {item.prix.toFixed(3)} DT
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white/95 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                        {item.total.toFixed(3)} DT
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side - Total and payment */}
        <div className="w-full lg:w-96 flex flex-col justify-between gap-6">
          {/* Total section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 text-center"
          >
            <div className="text-xl text-white/60 mb-3 uppercase tracking-wider">
              {t('customerTotalTTC')}
            </div>
            <div className="text-8xl font-black text-cyan-400 mb-4 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
              {total.toFixed(3)}
            </div>
            <div className="text-3xl text-white/80 font-light">{t('currency')}</div>
          </motion.div>

          {/* Payment section */}
          {isPaid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6 text-center shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                <div className="text-lg text-white/70 mb-2">{t('customerAmountReceived')}</div>
                <div className="text-5xl font-bold text-white/95 mb-1">
                  {amountReceived?.toFixed(3)} {t('currency')}
                </div>
              </div>

              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-6 text-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <div className="text-lg text-white/70 mb-2">{t('customerChange')}</div>
                <div className="text-6xl font-black text-green-400 mb-1 drop-shadow-[0_0_20px_rgba(34,197,94,0.8)]">
                  {change.toFixed(3)} {t('currency')}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <p className="text-3xl font-semibold text-white/90 drop-shadow-lg">
                  {t('customerThankYou')}
                </p>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.5);
        }
      `}</style>
    </div>
  )
}
