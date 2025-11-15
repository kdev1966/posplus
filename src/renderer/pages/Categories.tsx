import React, { useEffect, useState } from 'react'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Category } from '@shared/types'

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

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

  return (
    <Layout>
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Categories</h1>
            <p className="text-gray-400">Manage product categories</p>
          </div>
          <Button variant="primary">
            + Add Category
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
                    <button className="text-primary-400 hover:text-primary-300 text-sm">Edit</button>
                    <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
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
              <h3 className="text-xl font-semibold text-white mb-2">No categories yet</h3>
              <p className="text-gray-400">Create your first category to organize your products</p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
