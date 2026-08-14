import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveSeLan } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry SE', () => {
	it('resolves Stockholm to SE', () => {
		expect(resolveCountry(59.3293, 18.0686)).toBe('SE');
	});

	it('resolves Göteborg to SE', () => {
		expect(resolveCountry(57.7089, 11.9746)).toBe('SE');
	});

	it('resolves Malmö to SE', () => {
		expect(resolveCountry(55.605, 13.0038)).toBe('SE');
	});

	it('resolves Umeå to SE', () => {
		expect(resolveCountry(63.8258, 20.263)).toBe('SE');
	});

	it('resolves Copenhagen to DK', () => {
		expect(resolveCountry(55.6761, 12.5683)).toBe('DK');
	});
});

describe('getGeoCapabilities SE', () => {
	it('marks SE capabilities with partial cadastre and full protected areas', () => {
		const caps = getGeoCapabilities('SE');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('SE map / legal / species / permits', () => {
	it('uses OpenTopoMap without cadastre overlay', () => {
		const provider = getMapProvider('SE');
		expect(provider.plan.tiles[0]).toMatch(/opentopomap/i);
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes SE legal pack with Artskyddsförordning and Skogsvårdslag', () => {
		const pack = getLegalContentPack('SE');
		expect(pack.country).toBe('SE');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.every((a) => a.id !== 'se_miljobalk_7_1')).toBe(true);
		expect(pack.articles.find((a) => a.id === 'se_artskyddsforordning')?.url).toContain(
			'artskyddsforordning-2007845'
		);
		expect(pack.articles.find((a) => a.id === 'se_skogsvardslagen')?.url).toContain(
			'skogsvardslag-1979429'
		);
	});

	it('exposes SE species pack with län-level veto for Taxus and Daphne', () => {
		const pack = getSpeciesProtectionPack('SE');
		expect(pack?.country).toBe('SE');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Artfakta/i);
		for (const id of ['se_taxus', 'se_daphne'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('regional');
		}
		for (const id of ['se_ilex', 'se_linnaea'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('caution');
			expect(entry?.scope).toBe('regional');
		}
	});

	it('exposes deep Skogsstyrelsen artskydd and Stockholm län injection', () => {
		const links = getEuPermitLinks('SE', 'state_forest');
		expect(links.find((l) => l.id === 'se_skogsstyrelsen')?.url).toContain('artskydd');
		expect(links.find((l) => l.id === 'se_naturvardsverket')?.url).toContain('allemansratten');

		expect(resolveSeLan({ commune: 'Stockholm' })).toBe('AB');
		expect(getEuPermitLinks('SE', 'private', { commune: 'Stockholm' })[0]?.id).toBe('se_lan_ab');
		expect(
			getEuPermitLinks('SE', 'private', { latitude: 59.3293, longitude: 18.0686 })[0]?.id
		).toBe('se_lan_ab');
		expect(getEuPermitLinks('SE', 'private').find((l) => l.id === 'se_kommun')?.url).toContain(
			'skr.se'
		);
	});

	it('exposes a Lantmäteriet Min Karta viewer deep link', () => {
		const link = getCadastreViewerLink('SE', 59.3293, 18.0686);
		expect(link?.url).toMatch(/minkarta\.lantmateriet\.se/i);
	});
});
