import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/customer.css'

export interface CartItem {
  nom: string
  quantite: number
  prix: number
  total: number
}

export default function CustomerDisplay(): JSX.Element {
  const [cart, setCart] = useState<CartItem[]>([])
  const [paid, setPaid] = useState<boolean>(false)
  const [received, setReceived] = useState<number | null>(null)

  useEffect(() => {
    // Listen for cart updates from main
    const off = window.electron.ipcRenderer.on('cart-updated', (_event, newCart: CartItem[]) => {
      setCart(newCart || [])
      // reset payment state on new cart
      setPaid(false)
      setReceived(null)
    })

    return () => {
      off()
    }
  }, [])

  const total = cart.reduce((s, it) => s + (it.total || 0), 0)
  const formattedTotal = total.toFixed(3)

  return (
    <div className="customer-root w-full h-full flex items-center justify-center bg-customer bg-cover p-6">
      <div className="w-full max-w-5xl h-full flex flex-col md:flex-row gap-6">
        <div className="flex-1 flex flex-col justify-center items-center">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-8 w-full max-w-2xl text-center"
              >
                <div className="logo-wrap mb-6">
                  <div className="logo rounded-full w-36 h-36 mx-auto flex items-center justify-center neon-glow">
                    <span className="text-4xl font-extrabold text-white/90">POS+</span>
                  </div>
                </div>
                <h2 className="text-2xl md:text-4xl text-white font-semibold mb-2">Bienvenue</h2>
                <p className="text-white/80">Votre ticket s'affichera ici</p>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="grid grid-cols-1 gap-4">
                  {cart.map((item, idx) => (
                    <motion.div
                      key={`${item.nom}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="product-card bg-white/8 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex justify-between items-center"
                    >
                      <div>
                        <div className="text-xl font-semibold text-white">{item.nom}</div>
                        <div className="text-sm text-white/70">{item.quantite} x {item.prix.toFixed(3)} DT</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">{item.total.toFixed(3)} DT</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full md:w-96 flex flex-col justify-between">
          <div className="bg-white/8 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl p-6 flex flex-col items-center">
            <div className="text-sm text-white/70 mb-2">TOTAL TTC</div>
            <div className="text-6xl md:text-7xl font-extrabold text-cyan-400 drop-shadow-neon mb-2">{formattedTotal} DT</div>
            <div className="w-full mt-4">
              {!paid ? (
                <button className="w-full py-3 rounded-xl bg-cyan-500/30 border border-cyan-400 text-white font-semibold" onClick={() => setPaid(true)}>
                  Encaisser
                </button>
              ) : (
                <div className="w-full text-center">
                  <div className="text-lg text-white/80">Montant reçu</div>
                  <div className="text-4xl font-bold text-white mt-2">{(received ?? total).toFixed(3)} DT</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            {paid ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white/6 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-2xl text-green-300 font-bold">Rendu: {(received !== null ? (received - total) : 0).toFixed(3)} DT</div>
                <div className="text-white/80">Merci pour votre visite !</div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
