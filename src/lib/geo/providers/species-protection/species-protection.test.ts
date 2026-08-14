import { describe, expect, it } from 'vitest';
import { lookupSpeciesProtection } from '$lib/geo/providers/species-protection/dispatch';
import { matchSpeciesProtectionEntry } from '$lib/geo/providers/species-protection/match';
import { frSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs/fr';
import {
	deSpeciesProtectionPack,
	esSpeciesProtectionPack
} from '$lib/geo/providers/species-protection/packs/intl';

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
	it('matches Pin de Salzmann as regional caution (not national list)', () => {
		const hit = matchSpeciesProtectionEntry('Pin de Salzmann', frSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('fr_pinus_salzmannii');
		expect(hit?.entry.level).toBe('caution');
		expect(hit?.entry.scope).toBe('regional');
	});

	it('matches scientific subsp name', () => {
		const hit = matchSpeciesProtectionEntry(
			'Pinus nigra subsp. salzmannii',
			frSpeciesProtectionPack.entries
		);
		expect(hit?.entry.id).toBe('fr_pinus_salzmannii');
	});

	it('matches Betula nana as national veto', () => {
		const hit = matchSpeciesProtectionEntry('Betula nana', frSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('fr_betula_nana');
		expect(hit?.entry.level).toBe('veto');
		expect(hit?.entry.scope).toBe('national');
	});

	it('matches Daphne striata but not Daphne mezereum', () => {
		expect(matchSpeciesProtectionEntry('Daphne striata', frSpeciesProtectionPack.entries)?.entry.id).toBe(
			'fr_daphne_striata'
		);
		expect(matchSpeciesProtectionEntry('Daphne mezereum', frSpeciesProtectionPack.entries)).toBeNull();
		expect(matchSpeciesProtectionEntry('Bois-joli', frSpeciesProtectionPack.entries)).toBeNull();
	});

	it('keeps Salix repens as regional caution', () => {
		const hit = matchSpeciesProtectionEntry('Salix repens', frSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('fr_salix_repens');
		expect(hit?.entry.scope).toBe('regional');
	});

	it('does not match common Pin sylvestre', () => {
		const hit = matchSpeciesProtectionEntry('Pin sylvestre', frSpeciesProtectionPack.entries);
		expect(hit).toBeNull();
	});

	it('ignores very short queries', () => {
		expect(matchSpeciesProtectionEntry('Pi', frSpeciesProtectionPack.entries)).toBeNull();
	});

	it('national entries stay within arrêté 1982 woody taxa curated here', () => {
		const nationalIds = frSpeciesProtectionPack.entries
			.filter((e) => e.scope === 'national')
			.map((e) => e.id)
			.sort();
		expect(nationalIds).toEqual([
			'fr_betula_nana',
			'fr_daphne_striata',
			'fr_dracocephalum',
			'fr_salix_lapponum'
		]);
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

	it('uses ES pack for Tejo as regional caution', () => {
		const scan = lookupSpeciesProtection('Tejo', ES_LAT, ES_LON);
		expect(scan.country).toBe('ES');
		expect(scan.hit?.id).toBe('es_taxus');
		expect(scan.hit?.level).toBe('caution');
	});

	it('matches Pinsapo as regional veto in ES', () => {
		const scan = lookupSpeciesProtection('Abies pinsapo', ES_LAT, ES_LON);
		expect(scan.hit?.id).toBe('es_abies_pinsapo');
		expect(scan.hit?.level).toBe('veto');
	});

	it('does not match cultivated olive as Acebuche', () => {
		expect(matchSpeciesProtectionEntry('Olea europaea', esSpeciesProtectionPack.entries)).toBeNull();
		expect(
			matchSpeciesProtectionEntry('Acebuche', esSpeciesProtectionPack.entries)?.entry.id
		).toBe('es_olea');
	});

	it('DE pack includes Seidelbast', () => {
		const hit = matchSpeciesProtectionEntry('Seidelbast', deSpeciesProtectionPack.entries);
		expect(hit?.entry.id).toBe('de_daphne');
	});
});
