import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolvePtRegion } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry PT / ES border', () => {
	it('resolves Lisbon to PT', () => {
		expect(resolveCountry(38.7223, -9.1393)).toBe('PT');
	});

	it('resolves Porto to PT', () => {
		expect(resolveCountry(41.1579, -8.6291)).toBe('PT');
	});

	it('resolves Faro to PT', () => {
		expect(resolveCountry(37.0194, -7.9304)).toBe('PT');
	});

	it('resolves Madeira to PT', () => {
		expect(resolveCountry(32.6669, -16.9241)).toBe('PT');
	});

	it('resolves Azores (Ponta Delgada) to PT', () => {
		expect(resolveCountry(37.7412, -25.6756)).toBe('PT');
	});

	it('resolves Vigo to ES', () => {
		expect(resolveCountry(42.2406, -8.7207)).toBe('ES');
	});

	it('resolves Madrid to ES', () => {
		expect(resolveCountry(40.4168, -3.7038)).toBe('ES');
	});

	it('resolves Tenerife to ES', () => {
		expect(resolveCountry(28.2916, -16.6291)).toBe('ES');
	});
});

describe('getGeoCapabilities PT', () => {
	it('marks PT as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('PT');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('PT map / legal / species / permits', () => {
	it('uses OpenTopoMap for Portugal', () => {
		const provider = getMapProvider('PT');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes a PT legal pack with DRE DL 169/2001 and DL 142/2008', () => {
		const pack = getLegalContentPack('PT');
		expect(pack.country).toBe('PT');
		expect(pack.sourceName).toMatch(/Diário da República|ICNF/i);
		expect(pack.articles.length).toBeGreaterThanOrEqual(3);
		expect(pack.articles.find((a) => a.id === 'pt_florestas')?.url).toContain('2001-167292655');
		expect(pack.articles.find((a) => a.id === 'pt_conservacao_natureza')?.url).toContain(
			'2008-34502775'
		);
	});

	it('exposes a PT species pack with national veto for cork and holm oak', () => {
		const pack = getSpeciesProtectionPack('PT');
		expect(pack?.country).toBe('PT');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/Flora-On/i);
		for (const id of ['pt_sobreiro', 'pt_azinheira'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		const taxus = pack?.entries.find((e) => e.id === 'pt_taxus');
		expect(taxus?.level).toBe('caution');
		expect(taxus?.scope).toBe('regional');
		expect(pack?.entries.some((e) => e.id === 'pt_juniperus_brevifolia')).toBe(true);
	});

	it('exposes deep ICNF hub and Madeira / Azores injection', () => {
		const links = getEuPermitLinks('PT', 'state_forest');
		expect(links.find((l) => l.id === 'pt_icnf')?.url).toContain('sobreiros');
		expect(resolvePtRegion({ commune: 'Funchal Madeira' })).toBe('madeira');
		expect(getEuPermitLinks('PT', 'private', { commune: 'Funchal' })[0]?.id).toBe('pt_madeira');
		expect(getEuPermitLinks('PT', 'state_forest', { commune: 'Ponta Delgada Açores' })[0]?.id).toBe(
			'pt_azores'
		);
	});

	it('exposes an OSM viewer hand-off', () => {
		const link = getCadastreViewerLink('PT', 38.7223, -9.1393);
		expect(link?.url).toMatch(/openstreetmap\.org/i);
	});
});
