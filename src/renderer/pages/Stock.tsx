import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Product } from '@shared/types'

export const Stock: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    type: 'in' as 'in' | 'out' | 'adjustment' | 'sale' | 'return',
    notes: '',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await window.api.getAllProducts()
      setProducts(data)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
    setLoading(false)
  }

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { label: 'Out of Stock', variant: 'danger' as const }
    if (product.stock <= product.minStock) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.api.adjustStock(
        parseInt(formData.productId),
        parseInt(formData.quantity),
        formData.type,
        formData.notes || undefined
      )
      setIsModalOpen(false)
      setFormData({
        productId: '',
        quantity: '',
        type: 'in',
        notes: '',
      })
      loadProducts()
    } catch (error) {
      console.error('Failed to adjust stock:', error)
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Stock Management</h1>
            <p className="text-gray-400">Monitor and manage inventory levels</p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + Adjust Stock
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">Total Products</div>
              <div className="text-3xl font-bold text-white">{products.length}</div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">Low Stock Items</div>
              <div className="text-3xl font-bold text-yellow-400">
                {products.filter(p => p.stock <= p.minStock && p.stock > 0).length}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">Out of Stock</div>
              <div className="text-3xl font-bold text-red-400">
                {products.filter(p => p.stock === 0).length}
              </div>
            </div>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Min Stock</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const status = getStockStatus(product)
                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                              📦
                            </div>
                            <div className="font-semibold text-white">{product.name}</div>
                          </div>
                        </td>
                        <td className="font-mono text-sm">{product.sku}</td>
                        <td className="font-semibold text-white">{product.stock}</td>
                        <td className="text-gray-400">{product.minStock}</td>
                        <td className="text-sm">{product.unit}</td>
                        <td>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="text-primary-400 hover:text-primary-300">Adjust</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Adjust Stock"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                Adjust Stock
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Product</label>
              <select
                name="productId"
                value={formData.productId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - Current: {product.stock} {product.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  required
                >
                  <option value="in">Stock In</option>
                  <option value="out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="sale">Sale</option>
                  <option value="return">Return</option>
                </select>
              </div>
            </div>
            <Input
              label="Notes (optional)"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
            />
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
