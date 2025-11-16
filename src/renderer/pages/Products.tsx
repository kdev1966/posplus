import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Product } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'

export const Products: React.FC = () => {
  const { t } = useLanguageStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    stock: '',
    minStock: '',
    unit: 'pcs',
    categoryId: '',
    discountRate: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newProduct = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        price: parseFloat(formData.price),
        cost: 0,
        taxRate: 0, // TTC pricing, no separate tax
        discountRate: formData.discountRate ? parseFloat(formData.discountRate) / 100 : 0,
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        unit: formData.unit,
        categoryId: parseInt(formData.categoryId),
      }

      await window.api.createProduct(newProduct)
      setIsModalOpen(false)
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: '',
        stock: '',
        minStock: '',
        unit: 'pcs',
        categoryId: '',
        discountRate: '',
      })
      loadProducts()
    } catch (error) {
      console.error('Failed to create product:', error)
      alert(t('errorOccurred'))
    }
  }

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('productsTitle')}</h1>
            <p className="text-gray-400">{t('manageProductCatalog')}</p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + {t('addProduct')}
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
                    <th>{t('product')}</th>
                    <th>{t('sku')}</th>
                    <th>{t('category')}</th>
                    <th>{t('price')}</th>
                    <th>{t('remise')}</th>
                    <th>Stock</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
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
                      <td className="font-semibold text-primary-300">{formatCurrency(product.price)}</td>
                      <td>
                        {product.discountRate > 0 ? (
                          <Badge variant="success">
                            {(product.discountRate * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td>
                        <span className={product.stock <= product.minStock ? 'text-yellow-400' : ''}>
                          {product.stock} {product.unit}
                        </span>
                      </td>
                      <td>
                        <Badge variant={product.isActive ? 'success' : 'danger'}>
                          {product.isActive ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="text-primary-400 hover:text-primary-300">{t('edit')}</button>
                          <button className="text-red-400 hover:text-red-300">{t('delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t('addNewProduct')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {t('addProduct')}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('productName')}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('sku')}
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
              />
            </div>
            <Input
              label={t('description')}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t('priceTTC')} (DT)`}
                name="price"
                type="number"
                step="0.001"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('categoryId')}
                name="categoryId"
                type="number"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('remise')}
                name="discountRate"
                type="number"
                step="1"
                min="0"
                max="100"
                value={formData.discountRate}
                onChange={handleInputChange}
                placeholder="0"
              />
              <div className="text-xs text-gray-400 flex items-end pb-2">
                {t('remiseHelp')}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label={t('stockQuantity')}
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('minStock')}
                name="minStock"
                type="number"
                value={formData.minStock}
                onChange={handleInputChange}
                required
              />
              <Input
                label={t('unit')}
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                required
              />
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
