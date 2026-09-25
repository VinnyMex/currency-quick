import { describe, it, expect } from 'vitest';
import { parseCurrencyString } from '../src/shared/formatter.js';

describe('parser de moedas', () => {
  // ── BRL ────────────────────────────────────────────────────────────────────
  it('identifica R$ 129,90', () => {
    const r = parseCurrencyString('R$ 129,90');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('BRL');
    expect(r.value).toBeCloseTo(129.90, 2);
  });

  it('identifica R$1.299,00 (sem espaço, com milhar)', () => {
    const r = parseCurrencyString('R$1.299,00');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('BRL');
    expect(r.value).toBeCloseTo(1299.00, 2);
  });

  it('identifica R$ 0,99', () => {
    const r = parseCurrencyString('R$ 0,99');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('BRL');
    expect(r.value).toBeCloseTo(0.99, 2);
  });

  // ── USD ────────────────────────────────────────────────────────────────────
  it('identifica US$ 49.99', () => {
    const r = parseCurrencyString('US$ 49.99');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('USD');
    expect(r.value).toBeCloseTo(49.99, 2);
  });

  it('identifica USD 1,234.56', () => {
    const r = parseCurrencyString('USD 1,234.56');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('USD');
    expect(r.value).toBeCloseTo(1234.56, 2);
  });

  // ── EUR ────────────────────────────────────────────────────────────────────
  it('identifica € 39,90', () => {
    const r = parseCurrencyString('€ 39,90');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('EUR');
    expect(r.value).toBeCloseTo(39.90, 2);
  });

  it('identifica EUR 100', () => {
    const r = parseCurrencyString('EUR 100');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('EUR');
    expect(r.value).toBeCloseTo(100, 0);
  });

  // ── GBP ────────────────────────────────────────────────────────────────────
  it('identifica £ 20.00', () => {
    const r = parseCurrencyString('£ 20.00');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('GBP');
    expect(r.value).toBeCloseTo(20, 2);
  });

  it('identifica GBP 50.00', () => {
    const r = parseCurrencyString('GBP 50.00');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('GBP');
  });

  // ── JPY ────────────────────────────────────────────────────────────────────
  it('identifica ¥ 1500', () => {
    const r = parseCurrencyString('¥ 1500');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('JPY');
    expect(r.value).toBeCloseTo(1500, 0);
  });

  // ── $ ambíguo ──────────────────────────────────────────────────────────────
  it('identifica $ como USD (ambíguo)', () => {
    const r = parseCurrencyString('$ 99.99');
    expect(r).not.toBeNull();
    expect(r.currency).toBe('USD');
    expect(r.ambiguous).toBe(true);
  });

  // ── Rejeições ──────────────────────────────────────────────────────────────
  it('rejeita texto sem valor monetário', () => {
    expect(parseCurrencyString('hello world')).toBeNull();
    expect(parseCurrencyString('apenas texto aqui')).toBeNull();
  });

  it('rejeita string vazia', () => {
    expect(parseCurrencyString('')).toBeNull();
  });

  it('rejeita null', () => {
    expect(parseCurrencyString(null)).toBeNull();
  });

  it('rejeita undefined', () => {
    expect(parseCurrencyString(undefined)).toBeNull();
  });

  it('rejeita número de telefone brasileiro', () => {
    expect(parseCurrencyString('(11) 99999-9999')).toBeNull();
    expect(parseCurrencyString('11 98765-4321')).toBeNull();
  });

  it('rejeita data no formato dd/mm/yyyy', () => {
    expect(parseCurrencyString('01/01/2026')).toBeNull();
  });

  it('rejeita data no formato mm/dd/yy', () => {
    expect(parseCurrencyString('12/31/25')).toBeNull();
  });

  it('rejeita valor zero', () => {
    expect(parseCurrencyString('R$ 0,00')).toBeNull();
  });

  it('rejeita valor negativo (não reconhecido)', () => {
    // O parser não lida com negativos explicitamente — deve retornar null
    expect(parseCurrencyString('R$ -10,00')).toBeNull();
  });
});
