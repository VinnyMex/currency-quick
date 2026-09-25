import { fetchWithTimeout } from '../api-client.js';

export class ExchangeRateProvider {
  // eslint-disable-next-line no-unused-vars
  async getLatestRates(baseCurrency, quoteCurrencies) {
    throw new Error('Not implemented');
  }
}

export class DemoProvider extends ExchangeRateProvider {
  async getLatestRates(baseCurrency) {
    const url = `https://api.frankfurter.app/latest?base=${encodeURIComponent(baseCurrency)}`;
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) throw new Error(`API erro: ${response.status}`);
    const data = await response.json();
    if (!data.rates) throw new Error('Resposta inválida da API');
    return {
      base: data.base,
      rates: data.rates,
      provider: 'demo (Frankfurter)',
      fetchedAt: new Date().toISOString()
    };
  }
}
