import { describe, expect, it } from 'vitest';
import { BONSAI_SPECIES_PRIORITY } from '$lib/constants/bonsai-species';
import { filterSpeciesDictionary, normalizeSpeciesQuery } from './species-filter';

describe('normalizeSpeciesQuery', () => {
	it('lowercases and strips accents', () => {
		expect(normalizeSpeciesQuery('Hêtre')).toBe('hetre');
		expect(normalizeSpeciesQuery('Érable')).toBe('erable');
	});
});

describe('filterSpeciesDictionary', () => {
	it('returns empty for blank query', () => {
		expect(filterSpeciesDictionary('', BONSAI_SPECIES_PRIORITY)).toEqual([]);
		expect(filterSpeciesDictionary('   ', BONSAI_SPECIES_PRIORITY)).toEqual([]);
	});

	it('matches pin species with prefix priority', () => {
		const results = filterSpeciesDictionary('pin', BONSAI_SPECIES_PRIORITY);
		expect(results.length).toBeGreaterThan(0);
		expect(results.every((name) => normalizeSpeciesQuery(name).includes('pin'))).toBe(true);
		expect(results[0]).toBe('Pin sylvestre');
	});

	it('matches without accents', () => {
		const results = filterSpeciesDictionary('hetre', BONSAI_SPECIES_PRIORITY);
		expect(results).toContain('Hêtre commun');
	});

	it('matches partial genev to genévrier', () => {
		const results = filterSpeciesDictionary('genev', BONSAI_SPECIES_PRIORITY);
		expect(results.some((name) => name.startsWith('Genévrier'))).toBe(true);
	});

	it('limits results', () => {
		const results = filterSpeciesDictionary('e', BONSAI_SPECIES_PRIORITY, 3);
		expect(results).toHaveLength(3);
	});
});
