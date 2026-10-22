import { describe, expect, it } from 'vitest';
import {
  centsToEurosInput,
  eurosToCents,
  priceFieldsFromInput,
  priceModeFromService,
} from './pricing';

describe('pricing', () => {
  it('should convert euros to rounded cents', () => {
    expect(eurosToCents(45)).toBe(4500);
    expect(eurosToCents(45.5)).toBe(4550);
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
  });

  it('should write a fixed price as both bounds', () => {
    expect(priceFieldsFromInput({ priceMode: 'FIXED', priceFromEuros: 60 })).toEqual({
      priceFromCents: 6000,
      priceToCents: 6000,
      priceOnRequest: false,
    });
  });

  it('should keep only the starting price in FROM mode', () => {
    expect(
      priceFieldsFromInput({ priceMode: 'FROM', priceFromEuros: 35, priceToEuros: 90 }),
    ).toEqual({
      priceFromCents: 3500,
      priceToCents: null,
      priceOnRequest: false,
    });
  });

  it('should keep both bounds in RANGE mode', () => {
    expect(
      priceFieldsFromInput({ priceMode: 'RANGE', priceFromEuros: 35, priceToEuros: 90 }),
    ).toEqual({
      priceFromCents: 3500,
      priceToCents: 9000,
      priceOnRequest: false,
    });
  });

  it('should keep a range with unknown maximum open', () => {
    expect(priceFieldsFromInput({ priceMode: 'RANGE', priceFromEuros: 35 })).toEqual({
      priceFromCents: 3500,
      priceToCents: null,
      priceOnRequest: false,
    });
  });

  it('should clear all amounts in ON_REQUEST mode', () => {
    expect(
      priceFieldsFromInput({ priceMode: 'ON_REQUEST', priceFromEuros: 50, priceToEuros: 80 }),
    ).toEqual({
      priceFromCents: null,
      priceToCents: null,
      priceOnRequest: true,
    });
  });

  it('should throw when a required amount is missing', () => {
    expect(() => priceFieldsFromInput({ priceMode: 'FIXED' })).toThrow();
    expect(() => priceFieldsFromInput({ priceMode: 'FROM' })).toThrow();
    expect(() => priceFieldsFromInput({ priceMode: 'RANGE' })).toThrow();
  });

  it('should infer the price mode from stored cents', () => {
    expect(
      priceModeFromService({ priceFromCents: 6000, priceToCents: 6000, priceOnRequest: false }),
    ).toBe('FIXED');
    expect(
      priceModeFromService({ priceFromCents: 3500, priceToCents: null, priceOnRequest: false }),
    ).toBe('FROM');
    expect(
      priceModeFromService({ priceFromCents: 3500, priceToCents: 9000, priceOnRequest: false }),
    ).toBe('RANGE');
    expect(
      priceModeFromService({ priceFromCents: null, priceToCents: null, priceOnRequest: true }),
    ).toBe('ON_REQUEST');
    expect(
      priceModeFromService({ priceFromCents: null, priceToCents: null, priceOnRequest: false }),
    ).toBe('ON_REQUEST');
  });

  it('should format cents as a plain euros input value', () => {
    expect(centsToEurosInput(null)).toBe('');
    expect(centsToEurosInput(4500)).toBe('45');
    expect(centsToEurosInput(4550)).toBe('45.5');
  });
});
