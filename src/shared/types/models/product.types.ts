import { Category } from './category.types';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  price_ht: number;
  tax_rate: number;
  price_ttc: number;
  cost_price?: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithCategory extends Product {
  category?: Category;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  price_ht: number;
  tax_rate?: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  unit?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_id?: string;
  price_ht?: number;
  tax_rate?: number;
  cost_price?: number;
  stock_quantity?: number;
  min_stock_level?: number;
  unit?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  is_active?: boolean;
  low_stock?: boolean;
}
