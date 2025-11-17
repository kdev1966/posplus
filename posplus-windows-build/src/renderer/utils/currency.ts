// Currency formatting utility for Tunisian Dinar
export const formatCurrency = (amount: number): string => {
  return `${amount.toFixed(3)} DT`
}

export const formatCurrencyShort = (amount: number): string => {
  return `${amount.toFixed(2)} DT`
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
export const displayPrice = (price: number): string => {
  return `${price.toFixed(3)} DT`
}
