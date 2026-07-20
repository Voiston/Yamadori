import { describe, expect, it } from 'vitest';
import { lookupSpeciesProtection } from '$lib/geo/providers/species-protection/dispatch';
import { matchSpeciesProtectionEntry } from '$lib/geo/providers/species-protection/match';
import { frSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/fr';
import { deSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/intl';

/** Nantes area — FR */
const FR_LAT = 47.22;
const FR_LON = -1.55;
/** Near Madrid — ES */
const ES_LAT = 40.4;
const ES_LON = -3.7;
/** Near Berlin — DE */
const DE_LAT = 52.5;
const DE_LON = 13.4;

describe('matchSpeciesProtectionEntry', () => {
	it('matches Pin de Salzmann aliases', () => {
		const hit = matchSpeciesProtectionEntry('Pin de Salzmann', frSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('fr_pinus_salzmannii');
	});

	it('matches scientific subsp name', () => {
		const hit = matchSpeciesProtectionEntry(
			'Pinus nigra subsp. salzmannii',
			frSpeciesProtectionPack.entries
		);
		expect(hit?.entry.id).toBe('fr_pinus_salzmannii');
	});

	it('matches Betula nana', () => {
		const hit = matchSpeciesProtectionEntry('Betula nana', frSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('fr_betula_nana');
		expect(hit?.entry.level).toBe('veto');
	});

	it('does not match common Pin sylvestre', () => {
		const hit = matchSpeciesProtectionEntry('Pin sylvestre', frSpeciesProtectionPack.entries);
		expect(hit).toBeNull();
	});

	it('ignores very short queries', () => {
		expect(matchSpeciesProtectionEntry('Pi', frSpeciesProtectionPack.entries)).toBeNull();
	});
});

describe('lookupSpeciesProtection', () => {
	it('returns FR veto hit with full coverage', () => {
		const scan = lookupSpeciesProtection('Bouleau nain', FR_LAT, FR_LON);
		expect(scan.country).toBe('FR');
		expect(scan.coverage).toBe('full');
		expect(scan.hit?.level).toBe('veto');
		expect(scan.hit?.sourceName).toContain('INPN');
	});

	it('returns clear miss for common bonsai species in FR', () => {
		const scan = lookupSpeciesProtection('Hêtre commun', FR_LAT, FR_LON);
		expect(scan.hit).toBeNull();
		expect(scan.coverage).toBe('full');
	});

	it('uses country pack for DE Taxus', () => {
		const scan = lookupSpeciesProtection('Taxus baccata', DE_LAT, DE_LON);
		expect(scan.country).toBe('DE');
		expect(scan.coverage).toBe('partial');
		expect(scan.hit?.id).toBe('de_taxus');
	});

	it('uses ES pack for Tejo', () => {
		const scan = lookupSpeciesProtection('Tejo', ES_LAT, ES_LON);
		expect(scan.country).toBe('ES');
		expect(scan.hit?.id).toBe('es_taxus');
	});

	it('DE pack includes Seidelbast', () => {
		const hit = matchSpeciesProtectionEntry('Seidelbast', deSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('de_daphne');
	});
});
