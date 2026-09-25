import { getCurrency } from './currencies.js';

export function formatCurrency(value, currencyCode, locale = 'pt-BR') {
  const currency = getCurrency(currencyCode);
  const useLocale = currency ? currency.locale : locale;
  return new Intl.NumberFormat(useLocale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' ? 0 : 2
  }).format(value);
}

export function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

const CURRENCY_PATTERNS = [
  { regex: /R\$\s*([\d.,]+)/i,    currency: 'BRL', separator: 'br' },
  { regex: /US\$\s*([\d.,]+)/i,   currency: 'USD', separator: 'us' },
  { regex: /USD\s*([\d.,]+)/i,    currency: 'USD', separator: 'us' },
  { regex: /€\s*([\d.,]+)/,       currency: 'EUR', separator: 'br' },
  { regex: /EUR\s*([\d.,]+)/i,    currency: 'EUR', separator: 'us' },
  { regex: /£\s*([\d.,]+)/,       currency: 'GBP', separator: 'us' },
  { regex: /GBP\s*([\d.,]+)/i,    currency: 'GBP', separator: 'us' },
  { regex: /¥\s*([\d.,]+)/,       currency: 'JPY', separator: 'us' },
  { regex: /\$\s*([\d.,]+)/,      currency: 'USD', separator: 'us', ambiguous: true }
];

// Rejeita datas: dd/mm/yyyy, mm/dd/yyyy
const DATE_PATTERN = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;
// Rejeita telefones brasileiros
const PHONE_PATTERN = /\(?\d{2}\)?\s*\d{4,5}[-.\s]?\d{4}/;

export function parseCurrencyString(str) {
  if (!str || typeof str !== 'string') return null;
  const clean = str.trim();
  if (DATE_PATTERN.test(clean)) return null;
  if (PHONE_PATTERN.test(clean)) return null;

  for (const pattern of CURRENCY_PATTERNS) {
    const match = clean.match(pattern.regex);
    if (!match) continue;
    const raw = match[1];
    const value = parseNumericString(raw, pattern.separator);
    if (value === null || isNaN(value) || value <= 0) continue;
    return {
      value,
      currency: pattern.currency,
      ambiguous: pattern.ambiguous || false
    };
  }
  return null;
}

function parseNumericString(str, separator) {
  if (!str) return null;
  if (separator === 'br') {
    // BR format: 1.234,56 ou 1234,56
    const normalized = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized);
  }
  // US format: 1,234.56 ou 1234.56
  const normalized = str.replace(/,/g, '');
  return parseFloat(normalized);
}
