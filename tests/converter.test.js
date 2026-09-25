import { describe, it, expect } from 'vitest';
import { convert, invertCurrencies } from '../src/shared/converter.js';

const rates = {
  base: 'USD',
  rates: { BRL: 5.0, EUR: 0.9, GBP: 0.8 }
};

describe('converter', () => {
  it('converte BRL para USD', () => {
    // 10 BRL / 5 = 2 USD
    const r = convert(10, 'BRL', 'USD', rates);
    expect(r).toBeCloseTo(2, 2);
  });

  it('converte USD para BRL', () => {
    const r = convert(1, 'USD', 'BRL', rates);
    expect(r).toBeCloseTo(5, 2);
  });

  it('converte EUR para BRL', () => {
    // 1 EUR = (1/0.9) USD = 1.1111 USD → 1.1111 * 5 = 5.5555 BRL
    const r = convert(1, 'EUR', 'BRL', rates);
    expect(r).toBeCloseTo(5.555, 2);
  });

  it('converte USD para EUR', () => {
    const r = convert(1, 'USD', 'EUR', rates);
    expect(r).toBeCloseTo(0.9, 2);
  });

  it('converte GBP para EUR', () => {
    // 1 GBP = (1/0.8) USD = 1.25 USD → 1.25 * 0.9 = 1.125 EUR
    const r = convert(1, 'GBP', 'EUR', rates);
    expect(r).toBeCloseTo(1.125, 2);
  });

  it('retorna mesmo valor quando from === to', () => {
    const r = convert(100, 'USD', 'USD', rates);
    expect(r).toBe(100);
  });

  it('retorna mesmo valor quando from === to (não base)', () => {
    const r = convert(50, 'BRL', 'BRL', rates);
    expect(r).toBe(50);
  });

  it('lança erro para moeda não suportada (from)', () => {
    expect(() => convert(1, 'XYZ', 'USD', rates)).toThrow();
  });

  it('lança erro para moeda não suportada (to)', () => {
    expect(() => convert(1, 'USD', 'XYZ', rates)).toThrow();
  });

  it('lança erro se rates for inválido', () => {
    expect(() => convert(1, 'USD', 'BRL', null)).toThrow('Rates inválido');
    expect(() => convert(1, 'USD', 'BRL', {})).toThrow('Rates inválido');
  });

  it('inverte moedas corretamente', () => {
    const { from, to } = invertCurrencies('BRL', 'USD');
    expect(from).toBe('USD');
    expect(to).toBe('BRL');
  });

  it('inverte moedas idênticas', () => {
    const { from, to } = invertCurrencies('EUR', 'EUR');
    expect(from).toBe('EUR');
    expect(to).toBe('EUR');
  });

  it('converte valor zero', () => {
    const r = convert(0, 'USD', 'BRL', rates);
    expect(r).toBe(0);
  });

  it('converte valor grande', () => {
    const r = convert(1_000_000, 'USD', 'BRL', rates);
    expect(r).toBeCloseTo(5_000_000, 0);
  });
});
