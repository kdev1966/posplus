export enum CashMovementType {
  OPENING = 'opening',
  CLOSING = 'closing',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  SALE = 'sale',
}

export const CashMovementTypeLabels: Record<CashMovementType, string> = {
  [CashMovementType.OPENING]: 'Ouverture',
  [CashMovementType.CLOSING]: 'Fermeture',
  [CashMovementType.DEPOSIT]: 'Dépôt',
  [CashMovementType.WITHDRAWAL]: 'Retrait',
  [CashMovementType.SALE]: 'Vente',
};
