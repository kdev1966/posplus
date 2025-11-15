import { ProductRepository } from '../ProductRepository'
import DatabaseService from '../../db'

describe('ProductRepository', () => {
  beforeAll(() => {
    // Initialize in-memory database for testing
    DatabaseService.getInstance().initialize()
  })

  afterAll(() => {
    DatabaseService.getInstance().close()
  })

  describe('create', () => {
    it('should create a product', () => {
      const productData = {
        sku: 'TEST001',
        name: 'Test Product',
        categoryId: 1,
        price: 10.99,
        cost: 5.00,
        taxRate: 0.2,
        stock: 100,
        minStock: 10,
        unit: 'pcs',
      }

      const product = ProductRepository.create(productData)

      expect(product).toBeDefined()
      expect(product.id).toBeDefined()
      expect(product.name).toBe('Test Product')
      expect(product.price).toBe(10.99)
    })
  })

  describe('findById', () => {
    it('should find a product by id', () => {
      const product = ProductRepository.findById(1)
      expect(product).toBeDefined()
    })

    it('should return null for non-existent product', () => {
      const product = ProductRepository.findById(99999)
      expect(product).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should return all products', () => {
      const products = ProductRepository.findAll()
      expect(Array.isArray(products)).toBe(true)
    })
  })

  describe('update', () => {
    it('should update a product', () => {
      const product = ProductRepository.create({
        sku: 'TEST002',
        name: 'Test Product 2',
        categoryId: 1,
        price: 20.00,
        cost: 10.00,
        taxRate: 0.2,
        stock: 50,
        minStock: 5,
        unit: 'pcs',
      })

      const updated = ProductRepository.update({
        id: product.id,
        price: 25.00,
      })

      expect(updated.price).toBe(25.00)
    })
  })

  describe('search', () => {
    it('should search products by name', () => {
      const results = ProductRepository.search('Test')
      expect(Array.isArray(results)).toBe(true)
    })
  })
})
