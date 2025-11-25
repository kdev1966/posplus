import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Product } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { toast } from '../store/toastStore'

type StockFilter = 'all' | 'low' | 'critical' | 'out'

export const Stock: React.FC = () => {
  const { t } = useLanguageStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [filter, setFilter] = useState<StockFilter>('all')
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
      toast.success(t('stockAdjustedSuccess'))
      loadProducts()
    } catch (error) {
      console.error('Failed to adjust stock:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleQuickRestock = (product: Product) => {
    setSelectedProduct(product)
    setRestockQuantity('')
    setIsRestockModalOpen(true)
  }

  const handleRestockSubmit = async () => {
    if (!selectedProduct || !restockQuantity) return

    try {
      await window.api.adjustStock(
        selectedProduct.id,
        parseInt(restockQuantity),
        'in',
        t('quickRestock')
      )
      setIsRestockModalOpen(false)
      setSelectedProduct(null)
      setRestockQuantity('')
      toast.success(t('productRestockedSuccess'))
      loadProducts()
    } catch (error) {
      console.error('Failed to restock:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleExportCSV = () => {
    const lowStockProducts = products.filter(p => p.stock <= p.minStock)

    if (lowStockProducts.length === 0) {
      toast.info(t('noLowStockToExport'))
      return
    }

    const headers = [t('product'), t('sku'), t('currentStock'), t('minStock'), t('unit'), t('suggestedQuantity')]
    const rows = lowStockProducts.map(p => [
      p.name,
      p.sku,
      p.stock.toString(),
      p.minStock.toString(),
      p.unit,
      Math.max(p.minStock * 2 - p.stock, p.minStock).toString() // Suggested reorder quantity
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `stock-faible-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    toast.success(t('csvExportedSuccess'))
  }

  const getFilteredProducts = () => {
    switch (filter) {
      case 'low':
        return products.filter(p => p.stock <= p.minStock && p.stock > 0)
      case 'critical':
        return products.filter(p => p.stock <= p.minStock / 2 && p.stock > 0)
      case 'out':
        return products.filter(p => p.stock === 0)
      default:
        return products
    }
  }

  const filteredProducts = getFilteredProducts()
  const criticalCount = products.filter(p => p.stock <= p.minStock / 2 && p.stock > 0).length

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('stockTitle')}</h1>
            <p className="text-gray-400">{t('monitorInventory')}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExportCSV}>
              📊 {t('exportLowStockCSV')}
            </Button>
            <Button variant="primary" onClick={() => openAdjustModal()}>
              + {t('adjustStock')}
            </Button>
          </div>
        </div>

        {/* Enhanced Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-400 text-sm">{t('totalProducts')}</div>
                <div className="text-2xl">📦</div>
              </div>
              <div className="text-3xl font-bold text-white">{products.length}</div>
            </div>
          </Card>
          <Card className="glass border-yellow-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-yellow-400 text-sm">{t('lowStockProducts')}</div>
                <div className="text-2xl">⚠️</div>
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {products.filter(p => p.stock <= p.minStock && p.stock > 0).length}
              </div>
            </div>
          </Card>
          <Card className="glass border-red-500/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-red-400 text-sm">{t('criticalStockProducts')}</div>
                <div className="text-2xl">🚨</div>
              </div>
              <div className="text-3xl font-bold text-red-400">{criticalCount}</div>
            </div>
          </Card>
          <Card className="glass border-red-600/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-red-500 text-sm">{t('outOfStockProducts')}</div>
                <div className="text-2xl">❌</div>
              </div>
              <div className="text-3xl font-bold text-red-500">
                {products.filter(p => p.stock === 0).length}
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {t('allFilter')} ({products.length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'low'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ⚠️ {t('lowStockFilter')} ({products.filter(p => p.stock <= p.minStock && p.stock > 0).length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'critical'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🚨 {t('criticalFilter')} ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'out'
                ? 'bg-red-600/20 text-red-400 border border-red-600/30'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            ❌ {t('outOfStockFilter')} ({products.filter(p => p.stock === 0).length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('noProductsInCategory')}</h3>
              <p className="text-gray-400">
                {filter !== 'all' && t('allProductsSufficient')}
              </p>
            </div>
          </Card>
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
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product)
                    const isCritical = product.stock <= product.minStock / 2 && product.stock > 0
                    const isOut = product.stock === 0

                    return (
                      <tr key={product.id} className={
                        isOut ? 'bg-red-500/5' :
                        isCritical ? 'bg-red-500/10' :
                        product.stock <= product.minStock ? 'bg-yellow-500/5' : ''
                      }>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded flex items-center justify-center ${
                              isOut ? 'bg-red-500/20' :
                              isCritical ? 'bg-red-500/20' :
                              product.stock <= product.minStock ? 'bg-yellow-500/20' :
                              'bg-gray-800'
                            }`}>
                              {isOut ? '❌' : isCritical ? '🚨' : product.stock <= product.minStock ? '⚠️' : '📦'}
                            </div>
                            <div className="font-semibold text-white">{product.name}</div>
                          </div>
                        </td>
                        <td className="font-mono text-sm">{product.sku}</td>
                        <td>
                          <span className={`font-semibold ${
                            isOut ? 'text-red-500' :
                            isCritical ? 'text-red-400' :
                            product.stock <= product.minStock ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="text-gray-400">{product.minStock}</td>
                        <td className="text-sm">{product.unit}</td>
                        <td>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            {product.stock <= product.minStock && (
                              <button
                                className="text-green-400 hover:text-green-300 font-medium"
                                onClick={() => handleQuickRestock(product)}
                              >
                                ⚡ {t('quickRestock')}
                              </button>
                            )}
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

        {/* Quick Restock Modal */}
        <Modal
          isOpen={isRestockModalOpen}
          onClose={() => {
            setIsRestockModalOpen(false)
            setSelectedProduct(null)
            setRestockQuantity('')
          }}
          title={`⚡ ${t('quickRestock')}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setIsRestockModalOpen(false)
                setSelectedProduct(null)
                setRestockQuantity('')
              }}>
                {t('cancel')}
              </Button>
              <Button variant="success" onClick={handleRestockSubmit}>
                ✅ {t('quickRestock')}
              </Button>
            </>
          }
        >
          {selectedProduct && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-400">{t('sku')}: {selectedProduct.sku}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{t('currentStock')}:</span>
                    <span className="ml-2 text-yellow-400 font-semibold">{selectedProduct.stock} {selectedProduct.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('minStock')}:</span>
                    <span className="ml-2 text-white font-semibold">{selectedProduct.minStock} {selectedProduct.unit}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('quantity')}
                </label>
                <Input
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  placeholder={t('quantity')}
                  autoFocus
                />
              </div>

              {/* Suggested Quantities */}
              <div>
                <p className="text-sm text-gray-400 mb-2">{t('suggestedQuantity')}:</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRestockQuantity((selectedProduct.minStock - selectedProduct.stock).toString())}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-all"
                  >
                    {t('reachMinimum')} ({selectedProduct.minStock - selectedProduct.stock})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestockQuantity((selectedProduct.minStock * 2 - selectedProduct.stock).toString())}
                    className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-all"
                  >
                    {t('doubleMinimum')} ({selectedProduct.minStock * 2 - selectedProduct.stock})
                  </button>
                </div>
              </div>

              {/* Preview */}
              {restockQuantity && parseInt(restockQuantity) > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-sm text-green-300">
                    ✅ {t('newStock')}: <span className="font-semibold">{selectedProduct.stock + parseInt(restockQuantity)} {selectedProduct.unit}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  )
}
