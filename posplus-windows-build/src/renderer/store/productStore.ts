import { create } from 'zustand'
import { Product, Category } from '@shared/types'

interface ProductState {
  products: Product[]
  categories: Category[]
  isLoading: boolean
  error: string | null
  selectedCategory: number | null
  searchQuery: string
  fetchProducts: () => Promise<void>
  fetchCategories: () => Promise<void>
  setSelectedCategory: (categoryId: number | null) => void
  setSearchQuery: (query: string) => void
  getFilteredProducts: () => Product[]
  refreshProducts: () => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  searchQuery: '',

  fetchProducts: async () => {
    set({ isLoading: true, error: null })
    try {
      const products = await window.api.getAllProducts()
      set({ products, isLoading: false })
    } catch (error) {
      set({ error: 'Failed to fetch products', isLoading: false })
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await window.api.getAllCategories()
      set({ categories })
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  },

  setSelectedCategory: (categoryId) => {
    set({ selectedCategory: categoryId })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  getFilteredProducts: () => {
    const { products, selectedCategory, searchQuery } = get()
    let filtered = products

    // Filter by category
    if (selectedCategory !== null) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.barcode && p.barcode.toLowerCase().includes(query))
      )
    }

    return filtered.filter((p) => p.isActive)
  },

  refreshProducts: async () => {
    await get().fetchProducts()
  },
}))
