import React, { useEffect, useState, useRef } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Category } from '@shared/types'
import { useLanguageStore } from '../store/languageStore'
import { toast } from '../store/toastStore'

export const Categories: React.FC = () => {
  const { t } = useLanguageStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: '',
  })
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    displayOrder: '',
  })
  const categoryNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  // Auto-focus sur le champ nom de la catégorie quand la modal s'ouvre
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        categoryNameInputRef.current?.focus()
      }, 100)
    }
  }, [isModalOpen])

  const loadCategories = async () => {
    setLoading(true)
    try {
      const data = await window.api.getAllCategories()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
    setLoading(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newCategory = {
        name: formData.name,
        description: formData.description || undefined,
        displayOrder: formData.displayOrder ? parseInt(formData.displayOrder) : undefined,
        isActive: true,
      }

      await window.api.createCategory(newCategory)
      setIsModalOpen(false)
      setFormData({
        name: '',
        description: '',
        displayOrder: '',
      })
      loadCategories()
      toast.success(t('categoryAddedSuccess'))
    } catch (error) {
      console.error('Failed to create category:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setEditFormData({
      name: category.name,
      description: category.description || '',
      displayOrder: category.displayOrder?.toString() || '',
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    try {
      const updatedCategory = {
        id: editingCategory.id,
        name: editFormData.name,
        description: editFormData.description || undefined,
        displayOrder: editFormData.displayOrder ? parseInt(editFormData.displayOrder) : undefined,
      }

      await window.api.updateCategory(updatedCategory)
      setIsEditModalOpen(false)
      setEditingCategory(null)
      loadCategories()
      toast.success(t('categoryUpdated'))
    } catch (error) {
      console.error('Failed to update category:', error)
      toast.error(t('errorOccurred'))
    }
  }

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingCategory) return

    try {
      await window.api.deleteCategory(deletingCategory.id)
      setIsDeleteModalOpen(false)
      setDeletingCategory(null)
      loadCategories()
      toast.success(t('categoryDeleted'))
    } catch (error: any) {
      console.error('Failed to delete category:', error)
      if (error.message?.includes('products')) {
        toast.error(t('cannotDeleteCategoryWithProducts'))
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
            <h1 className="text-3xl font-bold text-white mb-2">{t('categoriesTitle')}</h1>
            <p className="text-gray-400">{t('manageCatalogCategories')}</p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + {t('addCategory')}
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id}>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center text-2xl">
                      🏷️
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{category.name}</h3>
                      <p className="text-sm text-gray-400">{category.description}</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      className="text-primary-400 hover:text-primary-300 text-sm"
                      onClick={() => handleEditClick(category)}
                    >
                      {t('edit')}
                    </button>
                    <button
                      className="text-red-400 hover:text-red-300 text-sm"
                      onClick={() => handleDeleteClick(category)}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && categories.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('noCategoriesYet')}</h3>
              <p className="text-gray-400">{t('createFirstCategory')}</p>
            </div>
          </Card>
        )}

        {/* Add Category Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={t('addNewCategory')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                {t('cancel')}
              </Button>
              <Button variant="primary" onClick={handleSubmit}>
                {t('addCategory')}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              ref={categoryNameInputRef}
              label={t('categoryName')}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <Input
              label={t('description')}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
            />
            <Input
              label={t('displayOrder')}
              name="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={handleInputChange}
            />
          </form>
        </Modal>

        {/* Edit Category Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingCategory(null)
          }}
          title={t('editCategory')}
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setIsEditModalOpen(false)
                setEditingCategory(null)
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
            <Input
              label={t('categoryName')}
              name="name"
              value={editFormData.name}
              onChange={handleEditInputChange}
              required
            />
            <Input
              label={t('description')}
              name="description"
              value={editFormData.description}
              onChange={handleEditInputChange}
            />
            <Input
              label={t('displayOrder')}
              name="displayOrder"
              type="number"
              value={editFormData.displayOrder}
              onChange={handleEditInputChange}
            />
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false)
            setDeletingCategory(null)
          }}
          title={t('deleteCategory')}
          footer={
            <>
              <Button variant="secondary" onClick={() => {
                setIsDeleteModalOpen(false)
                setDeletingCategory(null)
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
            <p className="text-gray-300 mb-2">{t('confirmDeleteCategory')}</p>
            {deletingCategory && (
              <p className="text-white font-semibold">{deletingCategory.name}</p>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
