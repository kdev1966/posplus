import React, { useEffect, useState, useRef } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Product, Category } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { formatCurrency } from '../utils/currency'
import { toast } from '../store/toastStore'

export const Products: React.FC = () => {
  const { t } = useLanguageStore()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    price: '',
    stock: '',
    minStock: '',
    unit: 'pcs',
    categoryId: '',
    discountRate: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    price: '',
    stock: '',
    minStock: '',
    unit: 'pcs',
    categoryId: '',
    discountRate: '',
  })
  const productNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  // Auto-focus sur le champ nom du produit quand la modal s'ouvre
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        productNameInputRef.current?.focus()
      }, 100)
    }
  }, [isModalOpen])

  // Écouter les événements de synchronisation P2P
  useEffect(() => {
    if (window.electron?.ipcRenderer) {
      const unsubscribe = window.electron.ipcRenderer.on('p2p-data-synced', (data: any) => {
        console.log('[Products] P2P data synced, refreshing products...', data)
        // Rafraîchir les produits si des produits ou toutes les données ont été synchronisées
        if (data.type === 'product' || data.type === 'all') {
          loadProducts()
        }
        // Rafraîchir les catégories si des catégories ou toutes les données ont été synchronisées
        if (data.type === 'category' || data.type === 'all') {
          loadCategories()
        }
      })

      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
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

  const loadCategories = async () => {
    try {
      const data = await window.api.getAllCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newProduct = {
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        price: parseFloat(formData.price),
        cost: 0,
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
        barcode: '',
        price: '',
        stock: '',
        minStock: '',
        unit: 'pcs',
        categoryId: '',
        discountRate: '',
      })
      loadProducts()
      toast.success(t('productAddedSuccess'))
    } catch (error) {
      console.error('Failed to create product:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setEditFormData({
      name: product.name,
      description: product.description || '',
      sku: product.sku,
      barcode: product.barcode || '',
      price: (product.price ?? 0).toString(),
      stock: (product.stock ?? 0).toString(),
      minStock: (product.minStock ?? 0).toString(),
      unit: product.unit || '',
      categoryId: (product.categoryId ?? 0).toString(),
      discountRate: ((product.discountRate ?? 0) * 100).toString(),
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    try {
      const updatedProduct = {
        id: editingProduct.id,
        name: editFormData.name,
        description: editFormData.description,
        sku: editFormData.sku,
        barcode: editFormData.barcode || undefined,
        price: parseFloat(editFormData.price),
        cost: editingProduct.cost,
        discountRate: editFormData.discountRate ? parseFloat(editFormData.discountRate) / 100 : 0,
        stock: parseInt(editFormData.stock),
        minStock: parseInt(editFormData.minStock),
        unit: editFormData.unit,
        categoryId: parseInt(editFormData.categoryId),
      }

      await window.api.updateProduct(updatedProduct)
      setIsEditModalOpen(false)
      setEditingProduct(null)
      loadProducts()
      toast.success(t('productUpdatedSuccess'))
    } catch (error) {
      console.error('Failed to update product:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleDeleteClick = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingProduct) return

    try {
      await window.api.deleteProduct(deletingProduct.id)
      setIsDeleteModalOpen(false)
      setDeletingProduct(null)
      loadProducts()
      toast.success(t('productDeletedSuccess'))
    } catch (error: any) {
      console.error('Failed to delete product:', error)

      // Check if error is due to product having stock
      if (error?.message?.includes('PRODUCT_HAS_STOCK')) {
        toast.error(t('cannotDeleteProductWithStock'))
      } else {
        toast.error(t('errorOccurred'))
      }
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
                    <th>{t('stock')}</th>
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
                      <td className="text-sm">
                        {product.categoryName || categories.find(c => c.id === product.categoryId)?.name || '-'}
                      </td>
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
                          <button
                            className="text-primary-400 hover:text-primary-300"
                            onClick={() => handleEditClick(product)}
                          >
                            {t('edit')}
                          </button>
                          <button
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeleteClick(product)}
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Add Product Modal */}
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
                ref={productNameInputRef}
                label={t('productName')}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              <Input
                label={`${t('sku')} (${t('optional')})`}
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                placeholder={t('autoGenerated')}
              />
            </div>
            <Input
              label={t('barcode')}
              name="barcode"
              value={formData.barcode}
              onChange={handleInputChange}
              placeholder={t('barcodeExample')}
            />
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('category')}
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('unit')}
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="pcs">{t('unitPiece')}</option>
                  <option value="kg">{t('unitKg')}</option>
                  <option value="L">{t('unitLiter')}</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>

        {/* Edit Product Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingProduct(null)
          }}
          title={t('editProduct')}
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setIsEditModalOpen(false)
                setEditingProduct(null)
              }}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleEditSubmit}>
                {t('save')}
              </Button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('productName')}
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                required
              />
              <Input
                label={t('sku')}
                name="sku"
                value={editFormData.sku}
                onChange={handleEditInputChange}
                required
              />
            </div>
            <Input
              label={t('barcode')}
              name="barcode"
              value={editFormData.barcode}
              onChange={handleEditInputChange}
              placeholder={t('barcodeExample')}
            />
            <Input
              label={t('description')}
              name="description"
              value={editFormData.description}
              onChange={handleEditInputChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t('priceTTC')} (DT)`}
                name="price"
                type="number"
                step="0.001"
                value={editFormData.price}
                onChange={handleEditInputChange}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('category')}
                </label>
                <select
                  name="categoryId"
                  value={editFormData.categoryId}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">{t('selectCategory')}</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('remise')}
                name="discountRate"
                type="number"
                step="1"
                min="0"
                max="100"
                value={editFormData.discountRate}
                onChange={handleEditInputChange}
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
                value={editFormData.stock}
                onChange={handleEditInputChange}
                required
              />
              <Input
                label={t('minStock')}
                name="minStock"
                type="number"
                value={editFormData.minStock}
                onChange={handleEditInputChange}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('unit')}
                </label>
                <select
                  name="unit"
                  value={editFormData.unit}
                  onChange={handleEditInputChange}
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="pcs">{t('unitPiece')}</option>
                  <option value="kg">{t('unitKg')}</option>
                  <option value="L">{t('unitLiter')}</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingProduct(null)
          }}
          title={t('deleteProduct')}
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setIsDeleteModalOpen(false)
                setDeletingProduct(null)
              }}>
                {t('cancel')}
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                {t('delete')}
              </Button>
            </>
          }
        >
          <div className="text-center py-4">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-300 mb-2">{t('confirmDeleteProduct')}</p>
            {deletingProduct && (
              <p className="text-white font-semibold">{deletingProduct.name}</p>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
