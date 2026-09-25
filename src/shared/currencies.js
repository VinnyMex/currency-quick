export const CURRENCIES = [
  { code: 'BRL', name: 'Real Brasileiro',       symbol: 'R$',   locale: 'pt-BR' },
  { code: 'USD', name: 'Dólar Americano',        symbol: 'US$',  locale: 'en-US' },
  { code: 'EUR', name: 'Euro',                   symbol: '€',    locale: 'de-DE' },
  { code: 'GBP', name: 'Libra Esterlina',        symbol: '£',    locale: 'en-GB' },
  { code: 'JPY', name: 'Iene Japonês',           symbol: '¥',    locale: 'ja-JP' },
  { code: 'CAD', name: 'Dólar Canadense',        symbol: 'CA$',  locale: 'en-CA' },
  { code: 'AUD', name: 'Dólar Australiano',      symbol: 'A$',   locale: 'en-AU' },
  { code: 'CHF', name: 'Franco Suíço',           symbol: 'CHF',  locale: 'de-CH' },
  { code: 'ARS', name: 'Peso Argentino',         symbol: 'AR$',  locale: 'es-AR' },
  { code: 'CLP', name: 'Peso Chileno',           symbol: 'CL$',  locale: 'es-CL' },
  { code: 'MXN', name: 'Peso Mexicano',          symbol: 'MX$',  locale: 'es-MX' },
  { code: 'CNY', name: 'Yuan Chinês',            symbol: '¥',    locale: 'zh-CN' },
  { code: 'KRW', name: 'Won Sul-Coreano',        symbol: '₩',    locale: 'ko-KR' },
  { code: 'INR', name: 'Rúpia Indiana',          symbol: '₹',    locale: 'hi-IN' },
  { code: 'AED', name: 'Dirham dos EAU',         symbol: 'د.إ', locale: 'ar-AE' },
  { code: 'ZAR', name: 'Rand Sul-Africano',      symbol: 'R',    locale: 'en-ZA' }
];

export const CURRENCY_CODES = CURRENCIES.map(c => c.code);

export function getCurrency(code) {
  return CURRENCIES.find(c => c.code === code) || null;
}
