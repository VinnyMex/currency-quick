import { ExchangeRateProvider } from './demo-provider.js';
import { fetchWithTimeout } from '../api-client.js';

export class RealProvider extends ExchangeRateProvider {
  constructor(apiUrl, apiKey) {
    super();
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async getLatestRates(baseCurrency) {
    const url = `${this.apiUrl}?base=${encodeURIComponent(baseCurrency)}&apikey=${encodeURIComponent(this.apiKey)}`;
    const response = await fetchWithTimeout(url, {}, 10000);
    if (!response.ok) throw new Error(`API erro: ${response.status}`);
    const data = await response.json();
    if (!data.rates) throw new Error('Resposta inválida da API');
    return {
      base: data.base || baseCurrency,
      rates: data.rates,
      provider: 'real',
      fetchedAt: new Date().toISOString()
    };
  }
}
