export enum StockMovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  SALE = 'sale',
  RETURN = 'return',
}

export const StockMovementTypeLabels: Record<StockMovementType, string> = {
  [StockMovementType.IN]: 'Entrée',
  [StockMovementType.OUT]: 'Sortie',
  [StockMovementType.ADJUSTMENT]: 'Ajustement',
  [StockMovementType.SALE]: 'Vente',
  [StockMovementType.RETURN]: 'Retour',
};
