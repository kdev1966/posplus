import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Product } from '@shared/types'

export const Stock: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Stock Management</h1>
            <p className="text-gray-400">Monitor and manage inventory levels</p>
          </div>
          <Button variant="primary">
            + Add Stock
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
      </div>
    </Layout>
  )
}
