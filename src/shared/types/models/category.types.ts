export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryWithParent extends Category {
  parent?: Category;
}
