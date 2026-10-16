import { describe, expect, it } from 'vitest';
import {
	MAX_FAVORITE_SPECIES,
	MAX_GPS_SPECIES_PILLS,
	normalizeFavoriteSpecies,
	resolveCaptureSpeciesPills
} from './species-suggestions';

describe('normalizeFavoriteSpecies', () => {
	it('trims, drops blanks, and dedupes case-insensitively', () => {
		expect(
			normalizeFavoriteSpecies(['  Pin sylvestre  ', '', 'pin sylvestre', 'Genévrier commun'])
		).toEqual(['Pin sylvestre', 'Genévrier commun']);
	});

	it(`caps at ${MAX_FAVORITE_SPECIES}`, () => {
		const names = Array.from({ length: 12 }, (_, i) => `Espèce ${i + 1}`);
		expect(normalizeFavoriteSpecies(names)).toHaveLength(MAX_FAVORITE_SPECIES);
	});

	it('drops names longer than 256 characters', () => {
		expect(normalizeFavoriteSpecies(['a'.repeat(257), 'If'])).toEqual(['If']);
	});
});

describe('resolveCaptureSpeciesPills', () => {
	const gpsSpecies = ['Pin sylvestre', 'Charme commun', 'Hêtre commun', 'Chêne pédonculé', 'If', 'Érable sycomore'];

	it('returns nothing when shortcuts are off', () => {
		expect(
			resolveCaptureSpeciesPills({
				enabled: false,
				favorites: ['Pin sylvestre'],
				gpsSpecies,
				gpsReady: true
			})
		).toEqual([]);
	});

	it('prefers favorites over GPS, even before a fix', () => {
		expect(
			resolveCaptureSpeciesPills({
				enabled: true,
				favorites: ['  Genévrier commun  ', 'If', 'If'],
				gpsSpecies,
				gpsReady: false
			})
		).toEqual(['Genévrier commun', 'If']);
	});

	it(`falls back to the top ${MAX_GPS_SPECIES_PILLS} GPS species when favorites are empty`, () => {
		expect(
			resolveCaptureSpeciesPills({
				enabled: true,
				favorites: ['  ', ''],
				gpsSpecies,
				gpsReady: true
			})
		).toEqual(gpsSpecies.slice(0, MAX_GPS_SPECIES_PILLS));
	});

	it('returns nothing when GPS is not ready and favorites are empty', () => {
		expect(
			resolveCaptureSpeciesPills({
				enabled: true,
				favorites: [],
				gpsSpecies,
				gpsReady: false
			})
		).toEqual([]);
	});

	it('returns an empty list when GPS is ready but has no suggestions', () => {
		expect(
			resolveCaptureSpeciesPills({
				enabled: true,
				favorites: [],
				gpsSpecies: [],
				gpsReady: true
			})
		).toEqual([]);
	});
});
