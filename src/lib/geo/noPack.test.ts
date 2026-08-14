import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveNoStatsforvalter } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry NO', () => {
	it('resolves Oslo to NO', () => {
		expect(resolveCountry(59.9139, 10.7522)).toBe('NO');
	});

	it('resolves Bergen to NO', () => {
		expect(resolveCountry(60.3913, 5.3221)).toBe('NO');
	});

	it('resolves Tromsø to NO', () => {
		expect(resolveCountry(69.6492, 18.9553)).toBe('NO');
	});

	it('resolves Stockholm to SE', () => {
		expect(resolveCountry(59.3293, 18.0686)).toBe('SE');
	});
});

describe('getGeoCapabilities NO', () => {
	it('marks NO capabilities with full cadastre/protected and partial species/municipality', () => {
		const caps = getGeoCapabilities('NO');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('NO map / legal / species / permits', () => {
	it('uses a Kartverket-backed map plan', () => {
		const provider = getMapProvider('NO');
		expect(provider.plan.tiles.length).toBeGreaterThan(0);
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes NO legal pack with friluftsloven, naturmangfold and skogbruk', () => {
		const pack = getLegalContentPack('NO');
		expect(pack.country).toBe('NO');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.find((a) => a.id === 'no_friluftsloven')?.url).toContain('1957-06-28-16');
		expect(pack.articles.find((a) => a.id === 'no_naturmangfoldloven')?.url).toContain(
			'2009-06-19-100'
		);
		expect(pack.articles.find((a) => a.id === 'no_skogbruksloven')?.url).toContain('2005-05-27-31');
		expect(pack.articles.every((a) => !a.url.includes('/allemannsretten/ofte-stilte'))).toBe(
			true
		);
	});

	it('exposes NO species pack with regional caution only (no false national)', () => {
		const pack = getSpeciesProtectionPack('NO');
		expect(pack?.country).toBe('NO');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Artsdatabanken/i);
		for (const entry of pack?.entries ?? []) {
			expect(entry.level).toBe('caution');
			expect(entry.scope).toBe('regional');
		}
		const taxus = pack?.entries.find((e) => e.id === 'no_taxus');
		expect(taxus?.scope).not.toBe('national');
	});

	it('exposes deep MD allemannsretten and Oslo Statsforvalter injection', () => {
		const links = getEuPermitLinks('NO', 'state_forest');
		expect(links.find((l) => l.id === 'no_miljodir')?.url).toContain('allemannsretten');
		expect(links.find((l) => l.id === 'no_landbruksdirektoratet')?.url).toContain('skogbruk');
		expect(links.find((l) => l.id === 'no_naturmangfold')?.url).toContain('2009-06-19-100');

		expect(resolveNoStatsforvalter({ commune: 'Oslo' })).toBe('OV');
		expect(getEuPermitLinks('NO', 'private', { commune: 'Oslo' })[0]?.id).toBe('no_sf_ov');
		expect(
			getEuPermitLinks('NO', 'private', { latitude: 59.9139, longitude: 10.7522 })[0]?.id
		).toBe('no_sf_ov');
		expect(getEuPermitLinks('NO', 'private').find((l) => l.id === 'no_kommune')?.url).toContain(
			'ks.no'
		);
		expect(getEuPermitLinks('NO', 'private')[0]?.id).toBe('no_kommune');
		expect(resolveNoStatsforvalter({ commune: 'Bergen' })).toBe('VL');
		expect(resolveNoStatsforvalter({ commune: 'Tromsø' })).toBe('TF');
	});

	it('exposes a Kartverket Seeiendom viewer deep link', () => {
		const link = getCadastreViewerLink('NO', 59.9139, 10.7522);
		expect(link?.url).toMatch(/seeiendom\.kartverket\.no/i);
	});
});
