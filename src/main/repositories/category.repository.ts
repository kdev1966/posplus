import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base.repository';
import {
  Category,
  CategoryWithParent,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@shared/types/models';

export class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories';

  constructor() {
    super('CategoryRepository');
  }

  /**
   * Get all categories with parent information
   */
  getAllWithParent(): CategoryWithParent[] {
    const sql = `
      SELECT c.*, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = 1
      ORDER BY c.display_order, c.name
    `;

    const results = this.query<Category & { parent_name?: string }>(sql);

    return results.map(row => {
      const { parent_name, ...category } = row;
      return {
        ...category,
        is_active: Boolean(category.is_active),
        parent: parent_name
          ? {
              id: category.parent_id!,
              name: parent_name,
            }
          : undefined,
      } as CategoryWithParent;
    });
  }

  /**
   * Create category
   */
  createCategory(input: CreateCategoryInput): Category {
    const now = new Date().toISOString();

    const category = {
      id: uuidv4(),
      name: input.name,
      description: input.description || null,
      color: input.color || '#6366f1',
      icon: input.icon || null,
      parent_id: input.parent_id || null,
      display_order: input.display_order || 0,
      is_active: input.is_active !== undefined ? (input.is_active ? 1 : 0) : 1,
      created_at: now,
      updated_at: now,
    };

    return this.insert(category);
  }

  /**
   * Update category
   */
  updateCategory(id: string, input: UpdateCategoryInput): Category {
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.color !== undefined) updates.color = input.color;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.parent_id !== undefined) updates.parent_id = input.parent_id;
    if (input.display_order !== undefined) updates.display_order = input.display_order;
    if (input.is_active !== undefined) updates.is_active = input.is_active ? 1 : 0;

    return this.update(id, updates);
  }
}
