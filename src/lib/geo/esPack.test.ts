import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveEsCcaa } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { isInSpainCadastreCoverage } from '$lib/geo/providers/cadastre/es';

describe('resolveCountry ES', () => {
	it('resolves Madrid to ES', () => {
		expect(resolveCountry(40.4168, -3.7038)).toBe('ES');
	});

	it('resolves Tenerife to ES', () => {
		expect(resolveCountry(28.2916, -16.6291)).toBe('ES');
	});

	it('keeps Vigo as ES vs PT', () => {
		expect(resolveCountry(42.2406, -8.7207)).toBe('ES');
	});
});

describe('getGeoCapabilities ES', () => {
	it('marks ES as full cadastre/protected with partial municipality/species', () => {
		const caps = getGeoCapabilities('ES');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('ES map / legal / species / permits / cadastre', () => {
	it('uses IGN + Catastro overlay', () => {
		const provider = getMapProvider('ES');
		expect(provider.plan.tiles[0]).toContain('ign.es');
		expect(provider.cadastreOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes an ES legal pack with BOE articles', () => {
		const pack = getLegalContentPack('ES');
		expect(pack.country).toBe('ES');
		expect(pack.sourceName).toBe('BOE');
		expect(pack.articles.length).toBeGreaterThanOrEqual(3);
		expect(pack.articles.every((a) => a.url.includes('boe.es'))).toBe(true);
	});

	it('exposes an ES species pack with no false national LESRPE entries', () => {
		const pack = getSpeciesProtectionPack('ES');
		expect(pack?.country).toBe('ES');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.entries.every((e) => e.scope === 'regional')).toBe(true);
		expect(pack?.entries.some((e) => e.id === 'es_abies_pinsapo' && e.level === 'veto')).toBe(
			true
		);
	});

	it('exposes MITECO / Catastro / LESRPE permit links', () => {
		const links = getEuPermitLinks('ES', 'private');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['es_miteco', 'es_catastro', 'es_ccaa'])
		);
		expect(links.find((l) => l.id === 'es_ccaa')?.url).toContain('lesrpe');
	});

	it('covers Canarias in cadastre bbox helper', () => {
		expect(isInSpainCadastreCoverage(28.2916, -16.6291)).toBe(true);
		expect(isInSpainCadastreCoverage(40.4168, -3.7038)).toBe(true);
	});

	it('resolves Canarias CCAA hint', () => {
		expect(resolveEsCcaa({ commune: 'Las Palmas' })).toBe('cn');
	});

	it('exposes a Catastro viewer deep link', () => {
		const link = getCadastreViewerLink('ES', 40.4168, -3.7038);
		expect(link?.url).toMatch(/sedecatastro\.gob\.es/i);
	});
});
