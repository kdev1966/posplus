export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE = 'mobile',
  OTHER = 'other',
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Espèces',
  [PaymentMethod.CARD]: 'Carte bancaire',
  [PaymentMethod.MOBILE]: 'Paiement mobile',
  [PaymentMethod.OTHER]: 'Autre',
};
