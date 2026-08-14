import { describe, expect, it } from 'vitest';
import { roleForCountry } from '$lib/geo/providers/municipality/nominatimLookup';

describe('municipality roleForCountry', () => {
	it('maps PT and NZ to roles with search templates', () => {
		expect(roleForCountry('PT')).toBe('camara');
		expect(roleForCountry('IE')).toBe('council');
		expect(roleForCountry('AU')).toBe('council');
		expect(roleForCountry('NZ')).toBe('district');
		expect(roleForCountry('FR')).toBe('mairie');
		expect(roleForCountry('AT')).toBe('gemeinde');
		expect(roleForCountry('SE')).toBe('kommun');
		expect(roleForCountry('NO')).toBe('kommune');
		expect(roleForCountry('DK')).toBe('kommune');
		expect(roleForCountry('FI')).toBe('kunta');
		expect(roleForCountry('JP')).toBe('shichoson');
	});
});
