import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Product } from '@shared/types'

export const Products: React.FC = () => {
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

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
            <p className="text-gray-400">Manage your product catalog</p>
          </div>
          <Button variant="primary">
            + Add Product
          </Button>
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
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                            📦
                          </div>
                          <div>
                            <div className="font-semibold text-white">{product.name}</div>
                            <div className="text-xs text-gray-400">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-sm">{product.sku}</td>
                      <td className="text-sm">{product.categoryId}</td>
                      <td className="font-semibold text-primary-300">€{product.price.toFixed(2)}</td>
                      <td>
                        <span className={product.stock <= product.minStock ? 'text-yellow-400' : ''}>
                          {product.stock} {product.unit}
                        </span>
                      </td>
                      <td>
                        <Badge variant={product.isActive ? 'success' : 'danger'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="text-primary-400 hover:text-primary-300">Edit</button>
                          <button className="text-red-400 hover:text-red-300">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
