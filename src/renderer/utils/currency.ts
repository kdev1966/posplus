// Currency formatting utility for Tunisian Dinar
export const formatCurrency = (amount: number | undefined | null): string => {
  const value = amount ?? 0
  return `${value.toFixed(3)} DT`
}

export const formatCurrencyShort = (amount: number | undefined | null): string => {
  const value = amount ?? 0
  return `${value.toFixed(2)} DT`
}

// Parse currency string to number
export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[^0-9.,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Currency symbol
export const CURRENCY_SYMBOL = 'DT'
export const CURRENCY_CODE = 'TND'

// Format for display in tables and cards
export const displayPrice = (price: number | undefined | null): string => {
  const value = price ?? 0
  return `${value.toFixed(3)} DT`
}
