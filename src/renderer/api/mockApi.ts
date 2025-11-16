// Mock API for web development (when not running in Electron)
import type { IPCApi, User, LoginCredentials, AuthResponse } from '@shared/types'

// Simple in-memory user for development
const mockUser: User = {
  id: 1,
  username: 'admin',
  email: 'admin@posplus.local',
  firstName: 'System',
  lastName: 'Administrator',
  roleId: 1,
  roleName: 'Admin',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

let currentUser: typeof mockUser | null = null
let currentSession: import('@shared/types').CashSession | null = null
let sessionIdCounter = 1

// Mock products database
const mockProducts: import('@shared/types').Product[] = [
  {
    id: 1,
    sku: 'BEV-001',
    barcode: '8901234567890',
    name: 'Coca-Cola 33cl',
    description: 'Boisson gazeuse rafraîchissante',
    categoryId: 1,
    price: 2.50,
    cost: 1.20,
    taxRate: 20,
    discountRate: 0,
    stock: 150,
    minStock: 20,
    maxStock: 300,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/coca-cola.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    sku: 'BEV-002',
    barcode: '8901234567891',
    name: 'Eau Minérale 50cl',
    description: 'Eau minérale naturelle',
    categoryId: 1,
    price: 1.50,
    cost: 0.60,
    taxRate: 5.5,
    discountRate: 0,
    stock: 200,
    minStock: 30,
    maxStock: 400,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/water.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    sku: 'SNK-001',
    barcode: '8901234567892',
    name: 'Chips Paprika 150g',
    description: 'Chips croustillantes saveur paprika',
    categoryId: 2,
    price: 3.20,
    cost: 1.50,
    taxRate: 20,
    discountRate: 0,
    stock: 80,
    minStock: 15,
    maxStock: 150,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/chips.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    sku: 'SNK-002',
    barcode: '8901234567893',
    name: 'Cacahuètes Salées 200g',
    description: 'Cacahuètes grillées et salées',
    categoryId: 2,
    price: 2.80,
    cost: 1.30,
    taxRate: 20,
    discountRate: 0,
    stock: 60,
    minStock: 10,
    maxStock: 120,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/peanuts.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    sku: 'BKR-001',
    barcode: '8901234567894',
    name: 'Pain Complet',
    description: 'Pain complet frais du jour',
    categoryId: 3,
    price: 2.90,
    cost: 1.00,
    taxRate: 5.5,
    discountRate: 0,
    stock: 40,
    minStock: 5,
    maxStock: 80,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/bread.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    sku: 'BKR-002',
    barcode: '8901234567895',
    name: 'Croissant',
    description: 'Croissant au beurre artisanal',
    categoryId: 3,
    price: 1.80,
    cost: 0.70,
    taxRate: 5.5,
    discountRate: 0,
    stock: 30,
    minStock: 5,
    maxStock: 60,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/croissant.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 7,
    sku: 'DRY-001',
    barcode: '8901234567896',
    name: 'Lait Demi-Écrémé 1L',
    description: 'Lait demi-écrémé UHT',
    categoryId: 4,
    price: 1.40,
    cost: 0.80,
    taxRate: 5.5,
    discountRate: 0,
    stock: 100,
    minStock: 20,
    maxStock: 200,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/milk.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 8,
    sku: 'DRY-002',
    barcode: '8901234567897',
    name: 'Pâtes Spaghetti 500g',
    description: 'Pâtes italiennes de qualité',
    categoryId: 4,
    price: 2.10,
    cost: 0.90,
    taxRate: 5.5,
    discountRate: 0,
    stock: 120,
    minStock: 25,
    maxStock: 250,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/pasta.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 9,
    sku: 'FRZ-001',
    barcode: '8901234567898',
    name: 'Pizza Margherita',
    description: 'Pizza surgelée 4 fromages',
    categoryId: 5,
    price: 4.50,
    cost: 2.20,
    taxRate: 5.5,
    discountRate: 0,
    stock: 45,
    minStock: 10,
    maxStock: 100,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/pizza.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 10,
    sku: 'FRZ-002',
    barcode: '8901234567899',
    name: 'Glace Vanille 500ml',
    description: 'Crème glacée vanille onctueuse',
    categoryId: 5,
    price: 3.80,
    cost: 1.90,
    taxRate: 5.5,
    discountRate: 0,
    stock: 35,
    minStock: 8,
    maxStock: 70,
    unit: 'pcs',
    isActive: true,
    imageUrl: '/images/products/icecream.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Mock categories
const mockCategories: import('@shared/types').Category[] = [
  {
    id: 1,
    name: 'Boissons',
    description: 'Boissons fraîches et chaudes',
    parentId: undefined,
    displayOrder: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Snacks',
    description: 'Snacks et grignotages',
    parentId: undefined,
    displayOrder: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'Boulangerie',
    description: 'Pains et viennoiseries',
    parentId: undefined,
    displayOrder: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'Épicerie',
    description: 'Produits alimentaires secs',
    parentId: undefined,
    displayOrder: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: 'Surgelés',
    description: 'Produits surgelés',
    parentId: undefined,
    displayOrder: 5,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

let productIdCounter = 11
let categoryIdCounter = 6

export const createMockApi = (): IPCApi => ({
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    console.log('[Mock API] Login attempt:', { username: credentials.username, passwordLength: credentials.password.length })

    // Mock authentication - accept admin/admin123
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      currentUser = mockUser
      console.log('[Mock API] Login successful')
      return {
        success: true,
        user: mockUser,
      }
    }

    console.log('[Mock API] Login failed - invalid credentials')
    return {
      success: false,
      error: 'Invalid username or password',
    }
  },

  logout: async () => {
    console.log('[Mock API] Logout')
    currentUser = null
  },

  checkAuth: async (): Promise<AuthResponse> => {
    console.log('[Mock API] Check auth:', { authenticated: !!currentUser })
    if (currentUser) {
      return {
        success: true,
        user: currentUser,
      }
    }
    return {
      success: false,
      error: 'Not authenticated',
    }
  },

  changePassword: async () => false,

  // User handlers (mock)
  getAllUsers: async () => [],
  getUserById: async () => null,
  createUser: async () => mockUser,
  updateUser: async () => mockUser,
  deleteUser: async () => false,

  // Product handlers (mock)
  getAllProducts: async () => {
    console.log('[Mock API] Get all products:', mockProducts.length)
    return mockProducts.filter(p => p.isActive)
  },
  getProductById: async (id: number) => {
    const product = mockProducts.find(p => p.id === id)
    console.log('[Mock API] Get product by ID:', id, product ? 'found' : 'not found')
    return product || null
  },
  getProductByBarcode: async (barcode: string) => {
    const product = mockProducts.find(p => p.barcode === barcode)
    console.log('[Mock API] Get product by barcode:', barcode, product ? 'found' : 'not found')
    return product || null
  },
  searchProducts: async (query: string) => {
    const lowerQuery = query.toLowerCase()
    const results = mockProducts.filter(p =>
      p.isActive && (
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        p.barcode?.includes(query) ||
        p.description?.toLowerCase().includes(lowerQuery)
      )
    )
    console.log('[Mock API] Search products:', query, results.length, 'results')
    return results
  },
  createProduct: async (data: import('@shared/types').CreateProductDTO) => {
    const newProduct: import('@shared/types').Product = {
      id: productIdCounter++,
      ...data,
      maxStock: data.maxStock || data.stock * 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockProducts.push(newProduct)
    console.log('[Mock API] Product created:', newProduct.name)
    return newProduct
  },
  updateProduct: async (data: import('@shared/types').UpdateProductDTO) => {
    const index = mockProducts.findIndex(p => p.id === data.id)
    if (index !== -1) {
      mockProducts[index] = {
        ...mockProducts[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
      console.log('[Mock API] Product updated:', mockProducts[index].name)
      return mockProducts[index]
    }
    throw new Error('Product not found')
  },
  deleteProduct: async (id: number) => {
    const index = mockProducts.findIndex(p => p.id === id)
    if (index !== -1) {
      mockProducts[index].isActive = false
      console.log('[Mock API] Product deleted:', mockProducts[index].name)
      return true
    }
    return false
  },

  // Category handlers (mock)
  getAllCategories: async () => {
    console.log('[Mock API] Get all categories:', mockCategories.length)
    return mockCategories.filter(c => c.isActive)
  },
  getCategoryById: async (id: number) => {
    const category = mockCategories.find(c => c.id === id)
    console.log('[Mock API] Get category by ID:', id, category ? 'found' : 'not found')
    return category || null
  },
  createCategory: async (data: Omit<import('@shared/types').Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCategory: import('@shared/types').Category = {
      id: categoryIdCounter++,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockCategories.push(newCategory)
    console.log('[Mock API] Category created:', newCategory.name)
    return newCategory
  },
  updateCategory: async (data: Partial<import('@shared/types').Category> & { id: number }) => {
    const index = mockCategories.findIndex(c => c.id === data.id)
    if (index !== -1) {
      mockCategories[index] = {
        ...mockCategories[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
      console.log('[Mock API] Category updated:', mockCategories[index].name)
      return mockCategories[index]
    }
    throw new Error('Category not found')
  },
  deleteCategory: async (id: number) => {
    const index = mockCategories.findIndex(c => c.id === id)
    if (index !== -1) {
      mockCategories[index].isActive = false
      console.log('[Mock API] Category deleted:', mockCategories[index].name)
      return true
    }
    return false
  },

  // Ticket handlers (mock)
  createTicket: async () => ({} as any),
  getTicketById: async () => null,
  getAllTickets: async () => [],
  getTicketsBySession: async () => [],
  cancelTicket: async () => false,
  refundTicket: async () => false,

  // Cash session handlers (mock)
  openSession: async (userId: number, openingCash: number) => {
    console.log('[Mock API] Opening cash session:', { userId, openingCash })
    currentSession = {
      id: sessionIdCounter++,
      userId,
      openingCash,
      closingCash: undefined,
      expectedCash: undefined,
      difference: undefined,
      startedAt: new Date().toISOString(),
      closedAt: undefined,
      status: 'open',
    }
    console.log('[Mock API] Session opened:', currentSession)
    return currentSession
  },
  closeSession: async (sessionId: number, closingCash: number) => {
    console.log('[Mock API] Closing cash session:', { sessionId, closingCash })
    if (currentSession && currentSession.id === sessionId) {
      currentSession = {
        ...currentSession,
        closingCash,
        expectedCash: currentSession.openingCash,
        difference: closingCash - currentSession.openingCash,
        closedAt: new Date().toISOString(),
        status: 'closed',
      }
      console.log('[Mock API] Session closed:', currentSession)
      const closedSession = currentSession
      currentSession = null
      return closedSession
    }
    throw new Error('Session not found')
  },
  getCurrentSession: async () => {
    console.log('[Mock API] Get current session:', currentSession)
    return currentSession
  },
  getSessionById: async (id: number) => {
    if (currentSession && currentSession.id === id) {
      return currentSession
    }
    return null
  },

  // Report handlers (mock)
  generateZReport: async () => ({} as any),
  getSalesReport: async () => ({}),
  getStockReport: async () => ({}),

  // Stock handlers (mock)
  adjustStock: async () => false,
  getStockLogs: async () => [],

  // Printer handlers (mock)
  printTicket: async () => false,
  openDrawer: async () => false,
  getPrinterStatus: async () => ({ connected: false, ready: false }),

  // Sync handlers (mock)
  startSync: async () => false,
  getSyncStatus: async () => ({ status: 'not synced' }),
  exportData: async () => '',

  // System handlers (mock)
  getSystemInfo: async () => ({}),
  getSystemLogs: async () => [],
})
