import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveDeLand } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry DE', () => {
	it('resolves Berlin to DE', () => {
		expect(resolveCountry(52.52, 13.405)).toBe('DE');
	});

	it('resolves München to DE', () => {
		expect(resolveCountry(48.1351, 11.582)).toBe('DE');
	});

	it('resolves Hamburg to DE', () => {
		expect(resolveCountry(53.5511, 9.9937)).toBe('DE');
	});
});

describe('getGeoCapabilities DE', () => {
	it('marks DE capabilities with partial cadastre and full protected areas', () => {
		const caps = getGeoCapabilities('DE');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('DE map / legal / species / permits', () => {
	it('uses basemap.de without cadastre overlay', () => {
		const provider = getMapProvider('DE');
		expect(provider.plan.tiles[0]).toContain('basemapde');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes a DE legal pack including BNatSchG § 44', () => {
		const pack = getLegalContentPack('DE');
		expect(pack.country).toBe('DE');
		expect(pack.sourceName).toBe('Gesetze-im-Internet');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.every((a) => a.url.includes('gesetze-im-internet.de'))).toBe(true);
		expect(pack.articles.some((a) => a.id === 'de_bnatschg_44')).toBe(true);
	});

	it('exposes a DE species pack with BArtSchV national vetoes', () => {
		const pack = getSpeciesProtectionPack('DE');
		expect(pack?.country).toBe('DE');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(7);
		expect(pack?.sourceName).toContain('FloraWeb');
		const taxus = pack?.entries.find((e) => e.id === 'de_taxus');
		expect(taxus?.level).toBe('veto');
		expect(taxus?.scope).toBe('national');
		const osmunda = pack?.entries.find((e) => e.id === 'de_osmunda');
		expect(osmunda?.level).toBe('veto');
		expect(osmunda?.scope).toBe('national');
		const juniperus = pack?.entries.find((e) => e.id === 'de_juniperus');
		expect(juniperus?.level).toBe('caution');
		expect(juniperus?.scope).toBe('regional');
		expect(pack?.entries.some((e) => e.id === 'de_buxus' && e.scope === 'national')).toBe(true);
	});

	it('exposes deep BfN schutzgebiete + Land forst injection', () => {
		const links = getEuPermitLinks('DE', 'private');
		expect(links.map((l) => l.id)).toEqual(expect.arrayContaining(['de_bfn', 'de_lander_forst']));
		expect(links.find((l) => l.id === 'de_bfn')?.url).toContain('schutzgebiete');
		expect(links[0]?.id).toBe('de_lander_forst');
		expect(links.find((l) => l.id === 'de_wald')?.url).toContain('bwaldg');
		expect(resolveDeLand({ commune: 'München Bayern' })).toBe('BY');
		expect(getEuPermitLinks('DE', 'private', { commune: 'München Bayern' })[0]?.id).toBe(
			'de_forst_by'
		);
	});

	it('exposes a geoportal.de viewer deep link', () => {
		const link = getCadastreViewerLink('DE', 52.52, 13.405);
		expect(link?.url).toMatch(/geoportal\.de/i);
	});
});
