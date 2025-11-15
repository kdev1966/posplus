import { CashMovementType } from '../enums';
import { UserSafe } from './user.types';

export interface CashMovement {
  id: string;
  user_id: string;
  type: CashMovementType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface CashMovementWithUser extends CashMovement {
  user?: UserSafe;
}

export interface CreateCashMovementInput {
  type: CashMovementType;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface CashMovementFilters {
  user_id?: string;
  type?: CashMovementType;
  start_date?: string;
  end_date?: string;
}

export interface CashBalance {
  current_balance: number;
  opening_balance: number;
  total_sales: number;
  total_deposits: number;
  total_withdrawals: number;
}
