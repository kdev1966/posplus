export enum UserRole {
  ADMIN = 'admin',
  CASHIER = 'cashier',
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrateur',
  [UserRole.CASHIER]: 'Caissier',
};
