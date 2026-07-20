import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';

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
	});
});

describe('PT map / legal / species packs', () => {
	it('uses OpenTopoMap for Portugal', () => {
		const provider = getMapProvider('PT');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
	});

	it('exposes a PT legal pack', () => {
		expect(getLegalContentPack('PT').country).toBe('PT');
		expect(getLegalContentPack('PT').articles.length).toBeGreaterThan(0);
	});

	it('exposes a PT species-protection pack', () => {
		const pack = getSpeciesProtectionPack('PT');
		expect(pack?.country).toBe('PT');
		expect(pack?.entries.length).toBeGreaterThan(0);
	});
});
