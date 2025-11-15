import { PaymentMethod, PaymentStatus } from '../enums';
import { UserSafe } from './user.types';
import { Product } from './product.types';

export interface Sale {
  id: string;
  sale_number: string;
  user_id: string;
  customer_name?: string;
  subtotal_ht: number;
  total_tax: number;
  total_ttc: number;
  discount_amount: number;
  discount_percentage: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_paid: number;
  change_amount: number;
  notes?: string;
  synced: boolean;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price_ht: number;
  tax_rate: number;
  unit_price_ttc: number;
  subtotal_ht: number;
  subtotal_ttc: number;
  discount_amount: number;
  created_at: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  user?: UserSafe;
}

export interface SaleItemWithProduct extends SaleItem {
  product?: Product;
}

export interface CreateSaleInput {
  customer_name?: string;
  items: CreateSaleItemInput[];
  payment_method: PaymentMethod;
  amount_paid: number;
  discount_amount?: number;
  discount_percentage?: number;
  notes?: string;
}

export interface CreateSaleItemInput {
  product_id: string;
  quantity: number;
  unit_price_ht: number;
  tax_rate: number;
  discount_amount?: number;
}

export interface SaleFilters {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
}

export interface SalesSummary {
  total_sales: number;
  total_amount: number;
  total_items: number;
  average_sale: number;
  by_payment_method: Record<PaymentMethod, number>;
}
