const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('./logger.js').default;

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'; // Free API, base USD

let exchangeRatesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000; // 1 second

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

// Supported currencies list
const supportedCurrencies = Object.keys(currencySymbols);

// Retry function with exponential backoff
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES, baseDelay = BASE_RETRY_DELAY) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      logger.logError(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Validate if currency is supported
function validateCurrency(currency) {
  if (!supportedCurrencies.includes(currency)) {
    throw new Error(`Unsupported currency: ${currency}. Supported currencies: ${supportedCurrencies.join(', ')}`);
  }
}

// Fetch exchange rates from API with retry logic
async function fetchExchangeRates() {
  try {
    const rates = await retryWithBackoff(async () => {
      const response = await fetch(EXCHANGE_API_URL);
      if (!response.ok) {
        throw new Error(`Exchange rate API request failed with status ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.rates || typeof data.rates !== 'object') {
        throw new Error('Invalid response format from exchange rate API');
      }
      return data.rates;
    });
    logger.info('Successfully fetched exchange rates from API');
    return rates;
  } catch (error) {
    logger.logError('Failed to fetch exchange rates from API after retries', error);
    return null;
  }
}

// Get cached or fresh exchange rates
async function getExchangeRates() {
  const now = Date.now();

  // Check if cache is valid
  if (exchangeRatesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    logger.debug('Using cached exchange rates');
    return exchangeRatesCache;
  }

  // Try to fetch from database first (PlatformSettings)
  try {
    const settings = await prisma.platformSettings.findFirst();
    if (settings && settings.exchangeRates) {
      const dbRates = JSON.parse(settings.exchangeRates);
      const dbTimestamp = settings.updatedAt.getTime();
      if ((now - dbTimestamp) < CACHE_DURATION) {
        exchangeRatesCache = dbRates;
        cacheTimestamp = dbTimestamp;
        logger.info('Using exchange rates from database cache');
        return dbRates;
      }
    }
  } catch (error) {
    logger.logError('Error fetching exchange rates from database', error);
  }

  // Fetch from API
  const rates = await fetchExchangeRates();
  if (rates) {
    exchangeRatesCache = rates;
    cacheTimestamp = now;

    // Update database
    try {
      await prisma.platformSettings.upsert({
        where: { id: 1 },
        update: { exchangeRates: JSON.stringify(rates) },
        create: { exchangeRates: JSON.stringify(rates) },
      });
      logger.info('Updated exchange rates in database');
    } catch (error) {
      logger.logError('Error updating exchange rates in database', error);
    }

    return rates;
  }

  // Fallback to cached rates if available
  if (exchangeRatesCache) {
    logger.warn('Using stale cached exchange rates as fallback');
    return exchangeRatesCache;
  }

  // Last resort fallback
  logger.error('No exchange rates available, using minimal fallback');
  return { USD: 1 };
}

// Convert amount from one currency to another
async function convertCurrency(amount, fromCurrency, toCurrency) {
  // Validate input types
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount: must be a valid number');
  }

  if (amount < 0) {
    throw new Error('Invalid amount: cannot be negative');
  }

  // Validate currencies
  try {
    validateCurrency(fromCurrency);
    validateCurrency(toCurrency);
  } catch (error) {
    throw new Error(`Currency conversion failed: ${error.message}`);
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates();

  // Check if required rates are available
  if (!rates[fromCurrency] && fromCurrency !== 'USD') {
    throw new Error(`Exchange rate not available for currency: ${fromCurrency}`);
  }
  if (!rates[toCurrency] && toCurrency !== 'USD') {
    throw new Error(`Exchange rate not available for currency: ${toCurrency}`);
  }

  // Convert to USD first if not already
  let usdAmount;
  try {
    if (fromCurrency === 'USD') {
      usdAmount = amount;
    } else {
      if (rates[fromCurrency] === 0) {
        throw new Error(`Invalid exchange rate for ${fromCurrency}: cannot divide by zero`);
      }
      usdAmount = amount / rates[fromCurrency];
    }
  } catch (error) {
    logger.logError(`Error converting ${amount} ${fromCurrency} to USD`, error);
    throw new Error(`Currency conversion failed: ${error.message}`);
  }

  // Convert from USD to target currency
  try {
    if (toCurrency === 'USD') {
      return usdAmount;
    } else {
      return usdAmount * rates[toCurrency];
    }
  } catch (error) {
    logger.logError(`Error converting ${usdAmount} USD to ${toCurrency}`, error);
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
}

// Get currency symbol
function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency;
}

// Format price with currency symbol
function formatPrice(amount, currency) {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
}

module.exports = {
  getExchangeRates,
  convertCurrency,
  getCurrencySymbol,
  formatPrice,
  validateCurrency,
  supportedCurrencies,
};