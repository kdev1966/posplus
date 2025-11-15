import { create } from 'zustand'
import { Product } from '@shared/types'

export interface CartItem {
  product: Product
  quantity: number
  discount: number
  total: number
}

interface CartState {
  items: CartItem[]
  subtotal: number
  tax: number
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
  tax: 0,
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
      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        total: product.price * quantity * (1 + product.taxRate),
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
    set({ items: [], subtotal: 0, tax: 0, discount: 0, total: 0 })
  },

  calculateTotals: () => {
    const items = get().items
    let subtotal = 0
    let tax = 0
    let discount = 0

    items.forEach((item) => {
      const itemSubtotal = item.product.price * item.quantity
      const itemTax = itemSubtotal * item.product.taxRate

      subtotal += itemSubtotal
      tax += itemTax
      discount += item.discount

      // Update item total
      item.total = itemSubtotal + itemTax - item.discount
    })

    const total = subtotal + tax - discount

    set({ subtotal, tax, discount, total })
  },
}))
