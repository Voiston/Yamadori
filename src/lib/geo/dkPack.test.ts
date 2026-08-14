import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { roleForCountry } from '$lib/geo/providers/municipality/nominatimLookup';
import {
	buildArterDkSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

describe('resolveCountry DK / SE / DE borders', () => {
	it('resolves Copenhagen to DK', () => {
		expect(resolveCountry(55.6761, 12.5683)).toBe('DK');
	});

	it('resolves Aarhus to DK', () => {
		expect(resolveCountry(56.1629, 10.2039)).toBe('DK');
	});

	it('resolves Odense to DK', () => {
		expect(resolveCountry(55.4038, 10.4024)).toBe('DK');
	});

	it('resolves Bornholm to DK', () => {
		expect(resolveCountry(55.1604, 14.9497)).toBe('DK');
	});

	it('resolves Malmö to SE', () => {
		expect(resolveCountry(55.605, 13.0038)).toBe('SE');
	});

	it('resolves Hamburg to DE', () => {
		expect(resolveCountry(53.5511, 9.9937)).toBe('DE');
	});

	it('resolves Stockholm to SE', () => {
		expect(resolveCountry(59.3293, 18.0686)).toBe('SE');
	});
});

describe('getGeoCapabilities DK', () => {
	it('marks DK as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('DK');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('DK map / legal / species / permits', () => {
	it('uses OpenTopoMap for Denmark', () => {
		const provider = getMapProvider('DK');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes DK legal pack with Naturbeskyttelsesloven, Skovloven and artsfredning', () => {
		const pack = getLegalContentPack('DK');
		expect(pack.country).toBe('DK');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.every((a) => !a.url.includes('eli/lta/2024/1392'))).toBe(true);
		expect(pack.articles.find((a) => a.id === 'dk_nature')?.url).toContain('2024/927');
		expect(pack.articles.find((a) => a.id === 'dk_artsfredning')?.url).toContain('2021/521');
		expect(pack.articles.find((a) => a.id === 'dk_skovloven')?.url).toContain('2023/690');
		expect(pack.articles.find((a) => a.id === 'dk_forest')?.url).toContain(
			'aktiviteter-og-tilladelser'
		);
	});

	it('exposes DK species pack with Osmunda national veto and regional caution trees', () => {
		const pack = getSpeciesProtectionPack('DK');
		expect(pack?.country).toBe('DK');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Arter\.dk/i);
		const osmunda = pack?.entries.find((e) => e.id === 'dk_osmunda');
		expect(osmunda?.level).toBe('veto');
		expect(osmunda?.scope).toBe('national');
		for (const id of ['dk_taxus', 'dk_ilex', 'dk_juniperus'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('caution');
			expect(entry?.scope).toBe('regional');
		}
	});

	it('uses Arter.dk /taxa (not /search)', () => {
		expect(SPECIES_SEARCH_BASE.arterDk).toContain('arter.dk/taxa');
		expect(SPECIES_SEARCH_BASE.arterDk).not.toContain('/search');
		expect(buildArterDkSpeciesSearchUrl('Taxus')).toContain('arter.dk/taxa');
		expect(buildArterDkSpeciesSearchUrl('Taxus')).not.toContain('/search');
	});

	it('exposes deep Naturstyrelsen / artsfredning permit links without KL', () => {
		const forest = getEuPermitLinks('DK', 'state_forest');
		expect(forest.map((l) => l.id)).toContain('dk_naturstyrelsen');
		expect(forest.map((l) => l.id)).toContain('dk_miljostyrelsen');
		expect(forest.map((l) => l.id)).toContain('dk_kommune');
		expect(forest.find((l) => l.id === 'dk_naturstyrelsen')?.url).toContain(
			'aktiviteter-og-tilladelser'
		);
		expect(forest.find((l) => l.id === 'dk_miljostyrelsen')?.url).toContain('2021/521');
		expect(forest.every((l) => !l.url.includes('kl.dk'))).toBe(true);
		expect(getEuPermitLinks('DK', 'private')[0]?.id).toBe('dk_kommune');
		expect(getEuPermitLinks('DK', 'private').find((l) => l.id === 'dk_kommune')?.url).toContain(
			'borger.dk'
		);
	});

	it('exposes a cadastre viewer deep link', () => {
		const link = getCadastreViewerLink('DK', 55.6761, 12.5683);
		expect(link?.url).toContain('openstreetmap.org');
	});

	it('uses kommune role for Denmark', () => {
		expect(roleForCountry('DK')).toBe('kommune');
	});
});
