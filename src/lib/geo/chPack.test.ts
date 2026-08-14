import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveChCanton } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry CH', () => {
	it('resolves Zürich to CH', () => {
		expect(resolveCountry(47.3769, 8.5417)).toBe('CH');
	});

	it('resolves Genève to CH', () => {
		expect(resolveCountry(46.2044, 6.1432)).toBe('CH');
	});
});

describe('getGeoCapabilities CH', () => {
	it('marks all CH capabilities as partial', () => {
		const caps = getGeoCapabilities('CH');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('CH map / legal / species / permits', () => {
	it('uses swisstopo without cadastre overlay', () => {
		const provider = getMapProvider('CH');
		expect(provider.plan.tiles[0]).toContain('geo.admin.ch');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes a CH legal pack with Fedlex articles including NHG 20', () => {
		const pack = getLegalContentPack('CH');
		expect(pack.country).toBe('CH');
		expect(pack.sourceName).toBe('Fedlex');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.every((a) => a.url.includes('fedlex.admin.ch'))).toBe(true);
		expect(pack.articles.some((a) => a.id === 'ch_nhg_20')).toBe(true);
	});

	it('exposes a CH species pack with only regional scopes', () => {
		const pack = getSpeciesProtectionPack('CH');
		expect(pack?.country).toBe('CH');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.entries.every((e) => e.scope === 'regional')).toBe(true);
		expect(pack?.entries.some((e) => e.id === 'ch_daphne' && e.level === 'veto')).toBe(true);
		expect(pack?.sourceName).toContain('Info Flora');
	});

	it('exposes deep BAFU biodiversite + cadastre.ch links', () => {
		const links = getEuPermitLinks('CH', 'private');
		expect(links.map((l) => l.id)).toEqual(expect.arrayContaining(['ch_bafu', 'ch_cadastre']));
		expect(links.find((l) => l.id === 'ch_bafu')?.url).toContain('biodiversite');
		expect(links.find((l) => l.id === 'ch_cantons')).toBeUndefined();
	});

	it('injects canton portal when hint matches', () => {
		expect(resolveChCanton({ commune: 'Zürich' })).toBe('ZH');
		expect(resolveChCanton({ stateHint: 'CH-GE' })).toBe('GE');
		expect(getEuPermitLinks('CH', 'private', { commune: 'Lausanne' })[0]?.id).toBe(
			'ch_canton_vd'
		);
	});

	it('exposes a map.geo.admin.ch viewer deep link', () => {
		const link = getCadastreViewerLink('CH', 47.3769, 8.5417);
		expect(link?.url).toMatch(/map\.geo\.admin\.ch/i);
	});
});
