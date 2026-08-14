import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveItRegione } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry IT', () => {
	it('resolves Rome to IT', () => {
		expect(resolveCountry(41.9028, 12.4964)).toBe('IT');
	});

	it('resolves Milan to IT', () => {
		expect(resolveCountry(45.4642, 9.19)).toBe('IT');
	});
});

describe('getGeoCapabilities IT', () => {
	it('marks IT as full cadastre/protected with partial municipality/species', () => {
		const caps = getGeoCapabilities('IT');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('IT map / legal / species / permits', () => {
	it('uses OpenTopo + EEA overlay without cadastre WMS', () => {
		const provider = getMapProvider('IT');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.cadastreOverlay).toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes an IT legal pack with Normattiva articles', () => {
		const pack = getLegalContentPack('IT');
		expect(pack.country).toBe('IT');
		expect(pack.sourceName).toBe('Normattiva');
		expect(pack.articles.length).toBeGreaterThanOrEqual(3);
		expect(pack.articles.every((a) => a.url.includes('normattiva.it'))).toBe(true);
	});

	it('exposes an IT species pack with only regional scopes', () => {
		const pack = getSpeciesProtectionPack('IT');
		expect(pack?.country).toBe('IT');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.entries.every((e) => e.scope === 'regional')).toBe(true);
		expect(pack?.entries.some((e) => e.id === 'it_abies_nebrodensis' && e.level === 'veto')).toBe(
			true
		);
		expect(pack?.entries.some((e) => e.id === 'it_pinus_heldreichii' && e.level === 'veto')).toBe(
			true
		);
	});

	it('exposes MASE / Catasto / Carabinieri permit links', () => {
		const links = getEuPermitLinks('IT', 'private');
		expect(links.map((l) => l.id)).toEqual(
			expect.arrayContaining(['it_mase', 'it_catasto', 'it_carabinieri_forestali'])
		);
		expect(links.find((l) => l.id === 'it_mase')?.url).toContain(
			'aree-naturali-protette-e-rete-natura-2000'
		);
	});

	it('resolves Toscana and Sicilia region hints', () => {
		expect(resolveItRegione({ commune: 'Firenze' })).toBe('tos');
		expect(resolveItRegione({ commune: 'Palermo' })).toBe('sic');
		expect(getEuPermitLinks('IT', 'private', { commune: 'Milano' })[0]?.id).toBe('it_reg_lom');
	});

	it('exposes a Catasto viewer deep link', () => {
		const link = getCadastreViewerLink('IT', 41.9028, 12.4964);
		expect(link?.url).toMatch(/agenziaentrate\.gov\.it/i);
	});
});
