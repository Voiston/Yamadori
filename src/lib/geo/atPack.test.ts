import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveAtLand } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry AT', () => {
	it('resolves Vienna to AT', () => {
		expect(resolveCountry(48.2082, 16.3738)).toBe('AT');
	});

	it('resolves Innsbruck to AT', () => {
		expect(resolveCountry(47.2692, 11.4041)).toBe('AT');
	});

	it('resolves Graz to AT', () => {
		expect(resolveCountry(47.0707, 15.4395)).toBe('AT');
	});

	it('resolves München to DE', () => {
		expect(resolveCountry(48.1351, 11.582)).toBe('DE');
	});
});

describe('getGeoCapabilities AT', () => {
	it('marks AT capabilities with partial cadastre and full protected areas', () => {
		const caps = getGeoCapabilities('AT');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('AT map / legal / species / permits', () => {
	it('uses basemap.at without cadastre overlay', () => {
		const provider = getMapProvider('AT');
		expect(provider.plan.tiles[0]).toMatch(/basemap/i);
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes AT legal pack with ForstG §85 and Wiener NSchG', () => {
		const pack = getLegalContentPack('AT');
		expect(pack.country).toBe('AT');
		expect(pack.sourceName).toBe('RIS');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.find((a) => a.id === 'at_forstg_85')?.url).toContain('Paragraf=85');
		expect(pack.articles.find((a) => a.id === 'at_wiener_nschg')?.url).toContain('LrW');
		expect(pack.articles.every((a) => !a.url.includes('Ergebnis.wxe'))).toBe(true);
	});

	it('exposes AT species pack with Land-level veto for Taxus and Daphne', () => {
		const pack = getSpeciesProtectionPack('AT');
		expect(pack?.country).toBe('AT');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Biodiversitäts-Atlas|Atlas/i);
		for (const id of ['at_taxus', 'at_daphne'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('regional');
		}
		const ilex = pack?.entries.find((e) => e.id === 'at_ilex');
		expect(ilex?.level).toBe('caution');
		expect(ilex?.scope).toBe('regional');
	});

	it('exposes deep BMLUK hubs and Land injection for Vienna / Tirol', () => {
		const links = getEuPermitLinks('AT', 'state_forest');
		expect(links.find((l) => l.id === 'at_bmluk')?.url).toContain('bmluk');
		expect(links.find((l) => l.id === 'at_bmluk')?.url).toContain('wald');
		expect(links.find((l) => l.id === 'at_forstg')?.url).toContain('Forstgesetz');

		expect(resolveAtLand({ commune: 'Wien' })).toBe('W');
		expect(resolveAtLand({ commune: 'Innsbruck Tirol' })).toBe('T');
		expect(getEuPermitLinks('AT', 'private', { commune: 'Wien' })[0]?.id).toBe('at_land_w');
		expect(
			getEuPermitLinks('AT', 'private', { latitude: 47.2692, longitude: 11.4041 })[0]?.id
		).toBe('at_land_t');
	});

	it('exposes a basemap.at viewer deep link', () => {
		const link = getCadastreViewerLink('AT', 48.2082, 16.3738);
		expect(link?.url).toMatch(/basemap\.at/i);
	});
});
