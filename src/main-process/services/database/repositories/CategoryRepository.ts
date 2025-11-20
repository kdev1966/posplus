import DatabaseService from '../db'
import { Category } from '@shared/types'
import log from 'electron-log'

export class CategoryRepository {
  private db = DatabaseService.getInstance().getDatabase()

  // Helper to map database rows to Category objects
  private mapRow(row: any): Category {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  findAll(): Category[] {
    try {
      const stmt = this.db.prepare('SELECT * FROM categories ORDER BY display_order, name')
      const rows = stmt.all()
      return rows.map(row => this.mapRow(row))
    } catch (error) {
      log.error('CategoryRepository.findAll failed:', error)
      throw error
    }
  }

  findById(id: number): Category | null {
    try {
      const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?')
      const row = stmt.get(id)
      return row ? this.mapRow(row) : null
    } catch (error) {
      log.error('CategoryRepository.findById failed:', error)
      throw error
    }
  }

  findByParent(parentId: number | null): Category[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM categories
        WHERE ${parentId === null ? 'parent_id IS NULL' : 'parent_id = ?'}
        ORDER BY display_order, name
      `)
      const rows = parentId === null ? stmt.all() : stmt.all(parentId)
      return rows.map(row => this.mapRow(row))
    } catch (error) {
      log.error('CategoryRepository.findByParent failed:', error)
      throw error
    }
  }

  findActive(): Category[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM categories
        WHERE is_active = 1
        ORDER BY display_order, name
      `)
      const rows = stmt.all()
      return rows.map(row => this.mapRow(row))
    } catch (error) {
      log.error('CategoryRepository.findActive failed:', error)
      throw error
    }
  }

  create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Category {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO categories (name, description, parent_id, is_active, display_order)
        VALUES (?, ?, ?, ?, ?)
      `)

      const result = stmt.run(
        data.name,
        data.description || null,
        data.parentId || null,
        data.isActive ? 1 : 0,
        data.displayOrder || 0
      )

      const category = this.findById(result.lastInsertRowid as number)
      if (!category) {
        throw new Error('Failed to create category')
      }

      log.info(`Category created: ${category.name} (ID: ${category.id})`)
      return category
    } catch (error) {
      log.error('CategoryRepository.create failed:', error)
      throw error
    }
  }

  update(data: Partial<Category> & { id: number }): Category {
    try {
      const fields: string[] = []
      const values: any[] = []

      if (data.name !== undefined) {
        fields.push('name = ?')
        values.push(data.name)
      }
      if (data.description !== undefined) {
        fields.push('description = ?')
        values.push(data.description)
      }
      if (data.parentId !== undefined) {
        fields.push('parent_id = ?')
        values.push(data.parentId)
      }
      if (data.isActive !== undefined) {
        fields.push('is_active = ?')
        values.push(data.isActive ? 1 : 0)
      }
      if (data.displayOrder !== undefined) {
        fields.push('display_order = ?')
        values.push(data.displayOrder)
      }

      if (fields.length === 0) {
        throw new Error('No fields to update')
      }

      values.push(data.id)

      const stmt = this.db.prepare(`
        UPDATE categories SET ${fields.join(', ')} WHERE id = ?
      `)
      stmt.run(...values)

      const category = this.findById(data.id)
      if (!category) {
        throw new Error('Category not found after update')
      }

      log.info(`Category updated: ${category.name} (ID: ${category.id})`)
      return category
    } catch (error) {
      log.error('CategoryRepository.update failed:', error)
      throw error
    }
  }

  delete(id: number): boolean {
    try {
      // First check if category has products
      const checkStmt = this.db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?')
      const result = checkStmt.get(id) as { count: number }

      if (result.count > 0) {
        throw new Error('Cannot delete category with products')
      }

      const stmt = this.db.prepare('DELETE FROM categories WHERE id = ?')
      const deleteResult = stmt.run(id)

      log.info(`Category deleted: ID ${id}`)
      return deleteResult.changes > 0
    } catch (error) {
      log.error('CategoryRepository.delete failed:', error)
      throw error
    }
  }

  toggleActive(id: number): boolean {
    try {
      const stmt = this.db.prepare('UPDATE categories SET is_active = NOT is_active WHERE id = ?')
      const result = stmt.run(id)

      log.info(`Category active status toggled: ID ${id}`)
      return result.changes > 0
    } catch (error) {
      log.error('CategoryRepository.toggleActive failed:', error)
      throw error
    }
  }

  // Créer une catégorie depuis P2P sync (préserve l'ID)
  createFromSync(categoryData: any): Category {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO categories (id, name, description, parent_id, is_active, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        categoryData.id,
        categoryData.name,
        categoryData.description || null,
        categoryData.parentId || null,
        categoryData.isActive ? 1 : 0,
        categoryData.displayOrder || 0,
        categoryData.createdAt || new Date().toISOString(),
        categoryData.updatedAt || new Date().toISOString()
      )

      const category = this.findById(categoryData.id)
      if (!category) {
        throw new Error('Failed to create category from sync')
      }

      log.info(`P2P: Category synced: ${category.name} (ID: ${category.id})`)
      return category
    } catch (error) {
      log.error('CategoryRepository.createFromSync failed:', error)
      throw error
    }
  }
}

export default new CategoryRepository()
