import { create } from 'zustand'
import { Product } from '@shared/types'

export interface CartItem {
  product: Product
  quantity: number
  discount: number
  discountRate: number
  total: number
}

// Debounce utility for customer display updates
let customerDisplayTimeout: ReturnType<typeof setTimeout> | null = null
const CUSTOMER_DISPLAY_DEBOUNCE_MS = 150

interface CartState {
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  updateDiscount: (productId: number, discount: number) => void
  clearCart: () => void
  calculateTotals: () => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  subtotal: 0,
  discount: 0,
  total: 0,

  addItem: (product, quantity = 1) => {
    const items = get().items
    const existingItemIndex = items.findIndex((item) => item.product.id === product.id)

    if (existingItemIndex >= 0) {
      // Update existing item
      const newItems = [...items]
      newItems[existingItemIndex].quantity += quantity
      set({ items: newItems })
    } else {
      // Add new item with discount from product
      const itemSubtotal = product.price * quantity
      const itemDiscount = itemSubtotal * (product.discountRate || 0)
      const newItem: CartItem = {
        product,
        quantity,
        discount: itemDiscount,
        discountRate: product.discountRate || 0,
        total: itemSubtotal - itemDiscount,
      }
      set({ items: [...items, newItem] })
    }

    get().calculateTotals()
  },

  removeItem: (productId) => {
    const items = get().items.filter((item) => item.product.id !== productId)
    set({ items })
    get().calculateTotals()
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId)
      return
    }

    const items = get().items.map((item) =>
      item.product.id === productId ? { ...item, quantity } : item
    )
    set({ items })
    get().calculateTotals()
  },

  updateDiscount: (productId, discount) => {
    const items = get().items.map((item) =>
      item.product.id === productId ? { ...item, discount } : item
    )
    set({ items })
    get().calculateTotals()
  },

  clearCart: () => {
    set({ items: [], subtotal: 0, discount: 0, total: 0 })
  },

  calculateTotals: () => {
    const items = get().items
    let subtotal = 0
    let discount = 0

    items.forEach((item) => {
      // Price is TTC (tax included), no separate tax calculation
      const itemSubtotal = item.product.price * item.quantity
      // Apply product discount rate
      const itemDiscount = itemSubtotal * (item.product.discountRate || 0)

      subtotal += itemSubtotal
      discount += itemDiscount

      // Update item discount and total
      item.discount = itemDiscount
      item.discountRate = item.product.discountRate || 0
      item.total = itemSubtotal - itemDiscount
    })

    const total = subtotal - discount

    set({ subtotal, discount, total })

    // Debounced notification to customer display
    if (window.electron?.ipcRenderer) {
      // Clear previous timeout to debounce rapid updates
      if (customerDisplayTimeout) {
        clearTimeout(customerDisplayTimeout)
      }

      customerDisplayTimeout = setTimeout(() => {
        const customerCart = items.map((item) => ({
          nom: item.product.name,
          quantite: item.quantity,
          prix: item.product.price,
          total: item.total,
        }))
        window.electron?.ipcRenderer?.send('update-customer-display', customerCart)
        customerDisplayTimeout = null
      }, CUSTOMER_DISPLAY_DEBOUNCE_MS)
    }
  },
}))
