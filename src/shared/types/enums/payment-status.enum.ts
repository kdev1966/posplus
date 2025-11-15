export enum PaymentStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.COMPLETED]: 'Complété',
  [PaymentStatus.PENDING]: 'En attente',
  [PaymentStatus.CANCELLED]: 'Annulé',
  [PaymentStatus.REFUNDED]: 'Remboursé',
};
