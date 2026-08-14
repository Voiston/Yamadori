import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry GB nations', () => {
	it('resolves London to GB', () => {
		expect(resolveCountry(51.5074, -0.1278)).toBe('GB');
	});

	it('resolves Edinburgh to GB', () => {
		expect(resolveCountry(55.9533, -3.1883)).toBe('GB');
	});

	it('resolves Cardiff to GB', () => {
		expect(resolveCountry(51.4816, -3.1791)).toBe('GB');
	});

	it('resolves Belfast to GB', () => {
		expect(resolveCountry(54.5973, -5.9301)).toBe('GB');
	});
});

describe('getGeoCapabilities GB', () => {
	it('marks protected areas full with partial cadastre / species / municipality', () => {
		const caps = getGeoCapabilities('GB');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.cadastre).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('GB legal / species / permits / viewers', () => {
	it('exposes GB legal pack with Scotland ASP and NI Order plus WCA', () => {
		const pack = getLegalContentPack('GB');
		expect(pack.country).toBe('GB');
		expect(pack.sourceName).toMatch(/legislation\.gov\.uk/i);
		expect(pack.articles.length).toBeGreaterThanOrEqual(5);
		expect(pack.articles.find((a) => a.id === 'gb_wildlife_countryside_act_1981_s13')?.url).toContain(
			'ukpga/1981/69'
		);
		expect(pack.articles.find((a) => a.id === 'gb_nature_scotland_2004')?.url).toContain('asp/2004/6');
		expect(pack.articles.find((a) => a.id === 'gb_wildlife_ni_1985')?.url).toContain('nisi/1985/171');
	});

	it('exposes Schedule 8 national vetoes and regional caution for common woody species', () => {
		const pack = getSpeciesProtectionPack('GB');
		expect(pack?.country).toBe('GB');
		expect(pack?.sourceName).toMatch(/NBN/i);
		for (const id of ['gb_cotoneaster', 'gb_plymouth_pear'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		for (const id of ['gb_taxus', 'gb_daphne'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('caution');
			expect(entry?.scope).toBe('regional');
		}
	});

	it('exposes deep FC and NatureScot plants hubs; Scotland private leads with council + ROS', () => {
		const england = getEuPermitLinks('GB', 'state_forest', {
			latitude: 51.5,
			longitude: -0.12
		});
		expect(england.find((l) => l.id === 'gb_forestry')?.url).toContain('felling');
		expect(england.find((l) => l.id === 'gb_naturescot')?.url).toContain('plants-and-fungi');

		const scotland = getEuPermitLinks('GB', 'private', {
			latitude: 57.13,
			longitude: -3.72
		});
		expect(scotland[0]?.id).toBe('gb_local_council');
		expect(scotland[1]?.id).toBe('gb_ros');
		expect(scotland.find((l) => l.id === 'gb_naturescot')).toBeTruthy();
		expect(scotland.every((l) => !l.url.includes('google.com'))).toBe(true);

		const englandPrivate = getEuPermitLinks('GB', 'private', {
			latitude: 51.5,
			longitude: -0.12
		});
		expect(englandPrivate[0]?.id).toBe('gb_local_council');
		expect(englandPrivate[1]?.id).toBe('gb_hmlr');
		expect(englandPrivate[1]?.url).toContain('land-registry');

		const niPrivate = getEuPermitLinks('GB', 'private', {
			latitude: 54.6,
			longitude: -5.93
		});
		expect(niPrivate[0]?.id).toBe('gb_local_council');
		expect(niPrivate[1]?.id).toBe('gb_lrni');
	});

	it('exposes nation-honest cadastre viewers with OSM GPS hand-off', () => {
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.label).toBe(
			'HM Land Registry (GPS position)'
		);
		expect(getCadastreViewerLink('GB', 53.35, -1.8)?.url).toContain('openstreetmap.org');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.label).toContain('ScotLIS');
		expect(getCadastreViewerLink('GB', 57.13, -3.72)?.url).toContain('openstreetmap.org');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.label).toContain('nidirect');
		expect(getCadastreViewerLink('GB', 54.6, -5.93)?.url).toContain('openstreetmap.org');
	});
});
