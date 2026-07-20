import { describe, expect, it } from 'vitest';
import {
	parseSwissCantonCode,
	swissCantonLabel,
	isSwissCantonCode
} from '$lib/geo/providers/ch/canton';

describe('parseSwissCantonCode', () => {
	it('parses ISO 3166-2 CH-XX', () => {
		expect(parseSwissCantonCode('CH-ZH')).toBe('ZH');
		expect(parseSwissCantonCode('ch-ge')).toBe('GE');
	});

	it('parses federal ak tokens', () => {
		expect(parseSwissCantonCode('ZH')).toBe('ZH');
		expect(parseSwissCantonCode('be')).toBe('BE');
	});

	it('parses Nominatim state names', () => {
		expect(parseSwissCantonCode('Zürich')).toBe('ZH');
		expect(parseSwissCantonCode('Canton de Genève')).toBe('GE');
		expect(parseSwissCantonCode('Bern')).toBe('BE');
		expect(parseSwissCantonCode('Ticino')).toBe('TI');
	});

	it('returns null for unknown', () => {
		expect(parseSwissCantonCode('')).toBeNull();
		expect(parseSwissCantonCode('Bavaria')).toBeNull();
	});
});

describe('swissCantonLabel', () => {
	it('returns display labels', () => {
		expect(swissCantonLabel('ZH')).toBe('Zürich');
		expect(swissCantonLabel('GE')).toBe('Genève');
	});
});

describe('isSwissCantonCode', () => {
	it('validates codes', () => {
		expect(isSwissCantonCode('ZH')).toBe(true);
		expect(isSwissCantonCode('XX')).toBe(false);
	});
});
