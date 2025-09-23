// Client-side currency utilities

// Currency symbols mapping
const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  SEK: 'kr',
  NZD: 'NZ$',
  // Add more as needed
};

// Get currency symbol
export function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency;
}

// Format price with currency symbol
export function formatPrice(amount, currency) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

// Get current currency from settings (assuming settings are loaded)
export function getCurrentCurrency(settings) {
  return settings?.baseCurrency || 'USD';
}