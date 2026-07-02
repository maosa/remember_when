export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'AUD' | 'CAD' | 'CNY' | 'INR'

export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

// ISO 3166-1 alpha-2 (uppercase) → currency code. The Vercel `x-vercel-ip-country`
// header supplies the country. Unlisted countries fall back to DEFAULT_CURRENCY.
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD',
  GB: 'GBP',
  JP: 'JPY',
  CH: 'CHF',
  AU: 'AUD',
  CA: 'CAD',
  CN: 'CNY',
  IN: 'INR',
  // Eurozone (EUR)
  AT: 'EUR', BE: 'EUR', HR: 'EUR', CY: 'EUR', EE: 'EUR', FI: 'EUR',
  FR: 'EUR', DE: 'EUR', GR: 'EUR', IE: 'EUR', IT: 'EUR', LV: 'EUR',
  LT: 'EUR', LU: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SK: 'EUR',
  SI: 'EUR', ES: 'EUR',
}

// All symbols are prefixes. CHF carries a trailing space so prefix concatenation
// yields "CHF 0" without special-casing. JPY and CNY intentionally share "¥".
const CURRENCY_TO_SYMBOL: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  INR: '₹',
}

export function resolveCurrency(country?: string | null): CurrencyCode {
  if (!country) return DEFAULT_CURRENCY
  return COUNTRY_TO_CURRENCY[country.toUpperCase()] ?? DEFAULT_CURRENCY
}

export function currencySymbol(currency: CurrencyCode): string {
  return CURRENCY_TO_SYMBOL[currency]
}

export function formatPrice(amount: number, currency: CurrencyCode): string {
  return `${CURRENCY_TO_SYMBOL[currency]}${amount}`
}
