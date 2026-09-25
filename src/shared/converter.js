/**
 * Converte um valor de uma moeda para outra usando o objeto de rates.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @param {{ base: string, rates: Object }} ratesObj
 * @returns {number}
 */
export function convert(amount, from, to, ratesObj) {
  if (!ratesObj || !ratesObj.rates) throw new Error('Rates inválido');
  if (from === to) return amount;

  const { base, rates } = ratesObj;

  // Converter para base primeiro, se necessário
  let inBase;
  if (from === base) {
    inBase = amount;
  } else if (rates[from]) {
    inBase = amount / rates[from];
  } else {
    throw new Error(`Moeda não suportada: ${from}`);
  }

  if (to === base) return inBase;
  if (!rates[to]) throw new Error(`Moeda não suportada: ${to}`);

  return inBase * rates[to];
}

export function invertCurrencies(from, to) {
  return { from: to, to: from };
}
