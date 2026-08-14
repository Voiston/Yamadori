import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveNlProvince } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry NL', () => {
	it('resolves Amsterdam to NL', () => {
		expect(resolveCountry(52.3676, 4.9041)).toBe('NL');
	});

	it('resolves Rotterdam to NL', () => {
		expect(resolveCountry(51.9244, 4.4777)).toBe('NL');
	});

	it('resolves Maastricht to NL', () => {
		expect(resolveCountry(50.8514, 5.691)).toBe('NL');
	});

	it('resolves Antwerp to BE', () => {
		expect(resolveCountry(51.2194, 4.4025)).toBe('BE');
	});
});

describe('getGeoCapabilities NL', () => {
	it('marks NL cadastre and protected areas full with partial species/municipality', () => {
		const caps = getGeoCapabilities('NL');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('NL map / legal / species / permits', () => {
	it('uses PDOK BRT with BRK cadastre overlay', () => {
		const provider = getMapProvider('NL');
		expect(provider.plan.tiles[0]).toMatch(/pdok|brt/i);
		expect(provider.cadastreOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes NL legal pack with IPLO houtopstanden and no bogus GMO URL', () => {
		const pack = getLegalContentPack('NL');
		expect(pack.country).toBe('NL');
		expect(pack.articles.length).toBeGreaterThanOrEqual(3);
		expect(pack.articles.every((a) => !a.url.includes('BWBR0009653'))).toBe(true);
		expect(pack.articles.find((a) => a.id === 'nl_iplo_houtopstanden')?.url).toContain('iplo.nl');
		expect(pack.articles.find((a) => a.id === 'nl_iplo_houtopstanden')?.url).toContain(
			'houtopstand'
		);
		expect(pack.articles.find((a) => a.id === 'nl_omgevingswet_natuur')?.url).toContain(
			'BWBR0037885'
		);
	});

	it('exposes NL species pack with regional caution only (no national woody veto)', () => {
		const pack = getSpeciesProtectionPack('NL');
		expect(pack?.country).toBe('NL');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Verspreidingsatlas/i);
		expect(pack?.entries.every((e) => e.scope === 'regional')).toBe(true);
		expect(pack?.entries.every((e) => e.level === 'caution')).toBe(true);
		const juniper = pack?.entries.find((e) => e.id === 'nl_juniperus');
		expect(juniper?.scope).toBe('regional');
	});

	it('exposes deep RVO Omgevingswet hub and Noord-Holland injection for Amsterdam', () => {
		const links = getEuPermitLinks('NL', 'private');
		expect(links.find((l) => l.id === 'nl_rvo')?.url).toContain('omgevingswet-natuur');
		expect(links.find((l) => l.id === 'nl_rvo_flora')?.url).toContain('flora-en-fauna');
		expect(links.find((l) => l.id === 'nl_iplo_hout')?.url).toContain('iplo.nl');

		expect(resolveNlProvince({ commune: 'Amsterdam' })).toBe('NH');
		expect(getEuPermitLinks('NL', 'private', { commune: 'Amsterdam' })[0]?.id).toBe('nl_prov_nh');
		expect(
			getEuPermitLinks('NL', 'state_forest', { latitude: 52.3676, longitude: 4.9041 })[0]?.id
		).toBe('nl_prov_nh');
	});

	it('exposes a PDOK viewer deep link', () => {
		const link = getCadastreViewerLink('NL', 52.3676, 4.9041);
		expect(link?.url).toMatch(/pdok\.nl\/viewer/i);
	});
});
