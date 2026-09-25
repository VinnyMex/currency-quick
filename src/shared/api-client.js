export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRates(baseCurrency, provider = 'demo', apiUrl = '', apiKey = '') {
  if (provider === 'real' && apiUrl) {
    const { RealProvider } = await import('./providers/real-provider.js');
    const p = new RealProvider(apiUrl, apiKey);
    return p.getLatestRates(baseCurrency);
  }
  const { DemoProvider } = await import('./providers/demo-provider.js');
  const p = new DemoProvider();
  return p.getLatestRates(baseCurrency);
}
