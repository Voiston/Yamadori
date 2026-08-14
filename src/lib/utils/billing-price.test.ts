import { describe, expect, it } from 'vitest';
import { isValidPlayPriceString, normalizePlayPriceString } from './billing-price';

describe('billing-price', () => {
	it('accepts normal Play price strings', () => {
		expect(isValidPlayPriceString('59,99 €')).toBe(true);
		expect(isValidPlayPriceString('€59.99')).toBe(true);
	});

	it('rejects malformed trailing e prices', () => {
		expect(isValidPlayPriceString('59.99e')).toBe(false);
		expect(isValidPlayPriceString('59,99 e')).toBe(false);
	});

	it('normalizes trailing e to euro symbol', () => {
		expect(normalizePlayPriceString('59.99e')).toBe('59.99 €');
		expect(normalizePlayPriceString('59,99 e')).toBe('59,99 €');
	});

	it('normalizes EUR suffix', () => {
		expect(normalizePlayPriceString('49,00 EUR')).toBe('49,00 €');
	});
});
