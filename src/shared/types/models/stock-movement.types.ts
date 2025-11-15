import { StockMovementType } from '../enums';
import { Product } from './product.types';
import { UserSafe } from './user.types';

export interface StockMovement {
  id: string;
  product_id: string;
  user_id: string;
  type: StockMovementType;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface StockMovementWithDetails extends StockMovement {
  product?: Product;
  user?: UserSafe;
}

export interface CreateStockMovementInput {
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
}

export interface StockMovementFilters {
  product_id?: string;
  user_id?: string;
  type?: StockMovementType;
  start_date?: string;
  end_date?: string;
}
