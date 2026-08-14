import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import {
	buildNbdcSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

describe('resolveCountry IE / GB border', () => {
	it('resolves Dublin to IE', () => {
		expect(resolveCountry(53.3498, -6.2603)).toBe('IE');
	});

	it('resolves Cork to IE', () => {
		expect(resolveCountry(51.8985, -8.4756)).toBe('IE');
	});

	it('resolves Galway to IE', () => {
		expect(resolveCountry(53.2707, -9.0568)).toBe('IE');
	});

	it('resolves Donegal town to IE', () => {
		expect(resolveCountry(54.6538, -8.1096)).toBe('IE');
	});

	it('resolves Belfast to GB', () => {
		expect(resolveCountry(54.5973, -5.9301)).toBe('GB');
	});

	it('resolves Derry to GB', () => {
		expect(resolveCountry(54.9966, -7.3086)).toBe('GB');
	});

	it('resolves London to GB', () => {
		expect(resolveCountry(51.5074, -0.1278)).toBe('GB');
	});

	it('keeps Vigo as ES', () => {
		expect(resolveCountry(42.2406, -8.7207)).toBe('ES');
	});
});

describe('getGeoCapabilities IE', () => {
	it('marks IE as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('IE');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('IE map / legal / species / permits', () => {
	it('uses OpenTopoMap for Ireland', () => {
		const provider = getMapProvider('IE');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes IE legal pack with Land Act 27, Wildlife Act and FPO', () => {
		const pack = getLegalContentPack('IE');
		expect(pack.country).toBe('IE');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.every((a) => !a.url.includes('2009/act/30'))).toBe(true);
		expect(pack.articles.find((a) => a.id === 'ie_property')?.url).toContain('2009/act/27');
		expect(pack.articles.find((a) => a.id === 'ie_wildlife')?.url).toContain('1976/act/39');
		expect(pack.articles.find((a) => a.id === 'ie_fpo')?.url).toContain('flora-protection-order');
		expect(pack.articles.find((a) => a.id === 'ie_forestry')?.url).toContain('2014/act/31');
	});

	it('exposes IE species pack with FPO veto and regional caution trees', () => {
		const pack = getSpeciesProtectionPack('IE');
		expect(pack?.country).toBe('IE');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/NBDC|Biodiversity Ireland/i);
		for (const id of ['ie_salix_phylicifolia', 'ie_sorbus_anglica'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		for (const id of ['ie_taxus', 'ie_holly', 'ie_juniper'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('caution');
			expect(entry?.scope).toBe('regional');
		}
	});

	it('uses Biodiversity Ireland landing (not broken Species/Search)', () => {
		expect(SPECIES_SEARCH_BASE.nbdc).toContain('biodiversityireland.ie');
		expect(SPECIES_SEARCH_BASE.nbdc).not.toContain('/Species/Search');
		expect(buildNbdcSpeciesSearchUrl('Taxus')).not.toContain('/Species/Search');
	});

	it('exposes deep NPWS FPO / Coillte / LGMA permit links', () => {
		const forest = getEuPermitLinks('IE', 'state_forest');
		expect(forest.map((l) => l.id)).toEqual(
			expect.arrayContaining(['ie_npws', 'ie_coillte', 'ie_local_authority'])
		);
		expect(forest[0]?.id).toBe('ie_coillte');
		expect(forest.find((l) => l.id === 'ie_npws')?.url).toContain('flora-protection-order');
		expect(forest.find((l) => l.id === 'ie_coillte')?.url).toContain('/our-forests');
		expect(forest.find((l) => l.id === 'ie_local_authority')?.url).toContain('/en');
		expect(forest.every((l) => l.url !== 'https://www.npws.ie/')).toBe(true);
		expect(getEuPermitLinks('IE', 'private')[0]?.id).toBe('ie_local_authority');
	});

	it('exposes a cadastre viewer deep link', () => {
		const link = getCadastreViewerLink('IE', 53.35, -6.26);
		expect(link?.url).toContain('openstreetmap.org');
	});
});
