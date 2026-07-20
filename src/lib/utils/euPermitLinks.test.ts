import { describe, expect, it } from 'vitest';
import {
	getEuPermitLinks,
	resolveBeRegion,
	resolveDeLand,
	resolveEsCcaa
} from '$lib/geo/legal/euPermitLinks';

describe('getEuPermitLinks', () => {
	it('returns zone-aware FR links (mairie first on private)', () => {
		const privateLinks = getEuPermitLinks('FR', 'private');
		expect(privateLinks[0]?.id).toBe('fr_service_public');
		const forestLinks = getEuPermitLinks('FR', 'state_forest');
		expect(forestLinks[0]?.id).toBe('fr_onf');
	});

	it('covers BE Flanders and Brussels hubs', () => {
		const links = getEuPermitLinks('BE', 'private');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['be_spw', 'be_vlaanderen', 'be_brussels'])
		);
	});

	it('prioritizes BE Flanders when hint or coords say so', () => {
		expect(resolveBeRegion({ commune: 'Gent' })).toBe('flanders');
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 51.05,
			longitude: 3.72
		});
		expect(links[0]?.id).toBe('be_vlaanderen');
	});

	it('prioritizes BE Wallonie for southern coords', () => {
		expect(resolveBeRegion({ latitude: 50.4, longitude: 4.45 })).toBe('wallonie');
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 50.4,
			longitude: 4.45
		});
		expect(links[0]?.id).toBe('be_spw');
	});

	it('prioritizes BE Brussels for capital box', () => {
		const links = getEuPermitLinks('BE', 'private', {
			latitude: 50.85,
			longitude: 4.35
		});
		expect(links[0]?.id).toBe('be_brussels');
	});

	it('returns DE forest-oriented links for state forest', () => {
		const links = getEuPermitLinks('DE', 'state_forest');
		expect(links.some((l) => l.id === 'de_lander_forst')).toBe(true);
		expect(links.length).toBeGreaterThanOrEqual(2);
	});

	it('injects DE Land forst portal when NRW hinted', () => {
		expect(resolveDeLand({ stateHint: 'DE-NW' })).toBe('NW');
		const links = getEuPermitLinks('DE', 'state_forest', { stateHint: 'Nordrhein-Westfalen' });
		expect(links[0]?.id).toBe('de_forst_nw');
		expect(links.some((l) => l.id === 'de_lander_forst')).toBe(true);
	});

	it('injects DE RP forst portal when Rheinland-Pfalz hinted', () => {
		expect(resolveDeLand({ stateHint: 'DE-RP' })).toBe('RP');
		const links = getEuPermitLinks('DE', 'state_forest', { commune: 'Mainz Rheinland-Pfalz' });
		expect(links[0]?.id).toBe('de_forst_rp');
	});

	it('injects ES CCAA portal when commune matches', () => {
		expect(resolveEsCcaa({ commune: 'Barcelona' })).toBe('cat');
		const links = getEuPermitLinks('ES', 'private', { commune: 'Barcelona' });
		expect(links[0]?.id).toBe('es_ccaa_cat');
		expect(links.some((l) => l.id === 'es_miteco')).toBe(true);
	});

	it('returns empty for US (handled by usPermitLinks)', () => {
		expect(getEuPermitLinks('US', 'national_forest')).toEqual([]);
	});

	it('returns CH canton + BAFU starting points', () => {
		const links = getEuPermitLinks('CH', 'private');
		expect(links.some((l) => l.id === 'ch_bafu')).toBe(true);
		expect(links.some((l) => l.id === 'ch_cantons' || l.id === 'ch_cadastre')).toBe(true);
	});

	it('returns GB NatureScot first for Scotland coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 57.13,
			longitude: -3.72
		});
		expect(links[0]?.id).toBe('gb_naturescot');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['gb_natural_england', 'gb_naturescot', 'gb_nrw', 'gb_daera'])
		);
	});

	it('returns GB NRW first for Wales coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 52.5,
			longitude: -3.8
		});
		expect(links[0]?.id).toBe('gb_nrw');
	});

	it('returns GB DAERA first for NI coords', () => {
		const links = getEuPermitLinks('GB', 'private', {
			latitude: 54.6,
			longitude: -5.93
		});
		expect(links[0]?.id).toBe('gb_daera');
	});
});
