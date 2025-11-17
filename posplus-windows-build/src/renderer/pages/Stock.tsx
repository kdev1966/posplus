import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Product } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'

export const Stock: React.FC = () => {
  const { t } = useLanguageStore()
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
    if (product.stock === 0) return { label: t('outOfStock'), variant: 'danger' as const }
    if (product.stock <= product.minStock) return { label: t('lowStock'), variant: 'warning' as const }
    return { label: t('inStock'), variant: 'success' as const }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const openAdjustModal = (productId?: number) => {
    if (productId) {
      setFormData(prev => ({ ...prev, productId: productId.toString() }))
    }
    setIsModalOpen(true)
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
            <h1 className="text-3xl font-bold text-white mb-2">{t('stockTitle')}</h1>
            <p className="text-gray-400">{t('monitorInventory')}</p>
          </div>
          <Button variant="primary" onClick={() => openAdjustModal()}>
            + {t('adjustStock')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">{t('totalProducts')}</div>
              <div className="text-3xl font-bold text-white">{products.length}</div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">{t('lowStockProducts')}</div>
              <div className="text-3xl font-bold text-yellow-400">
                {products.filter(p => p.stock <= p.minStock && p.stock > 0).length}
              </div>
            </div>
          </Card>
          <Card>
            <div className="p-6">
              <div className="text-gray-400 mb-2">{t('outOfStockProducts')}</div>
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
                    <th>{t('product')}</th>
                    <th>{t('sku')}</th>
                    <th>{t('currentStock')}</th>
                    <th>{t('minStock')}</th>
                    <th>{t('unit')}</th>
                    <th>{t('status')}</th>
                    <th>{t('actions')}</th>
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
                            <button
                              className="text-primary-400 hover:text-primary-300"
                              onClick={() => openAdjustModal(product.id)}
                            >
                              {t('adjustStock')}
                            </button>
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
          title={t('adjustStock')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {t('adjustStock')}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">{t('product')}</label>
              <select
                name="productId"
                value={formData.productId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="">{t('selectProduct')}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - {t('current')}: {product.stock} {product.unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('quantity')}
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleInputChange}
                required
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">{t('stockType')}</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  required
                >
                  <option value="in">{t('stockIn')}</option>
                  <option value="out">{t('stockOut')}</option>
                  <option value="adjustment">{t('adjustment')}</option>
                  <option value="sale">{t('sale')}</option>
                  <option value="return">{t('return')}</option>
                </select>
              </div>
            </div>
            <Input
              label={t('notesOptional')}
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
