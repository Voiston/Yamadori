import { describe, expect, it } from 'vitest';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getEuPermitLinks, resolveBeRegion } from '$lib/geo/legal/euPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';

describe('resolveCountry BE', () => {
	it('resolves Bruxelles to BE', () => {
		expect(resolveCountry(50.8503, 4.3517)).toBe('BE');
	});

	it('resolves Antwerpen to BE', () => {
		expect(resolveCountry(51.2194, 4.4025)).toBe('BE');
	});

	it('resolves Liège to BE', () => {
		expect(resolveCountry(50.6326, 5.5797)).toBe('BE');
	});
});

describe('getGeoCapabilities BE', () => {
	it('marks BE cadastre and protected areas full, species/municipality partial', () => {
		const caps = getGeoCapabilities('BE');
		expect(caps.cadastre).toBe('full');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
		expect(caps.municipality).toBe('partial');
	});
});

describe('BE map / legal / species / permits', () => {
	it('uses OpenTopo with CadGIS overlay', () => {
		const provider = getMapProvider('BE');
		expect(provider.plan.tiles[0]).toMatch(/opentopomap/i);
		expect(provider.cadastreOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes a BE legal pack with ELI nature law and Bosdecreet', () => {
		const pack = getLegalContentPack('BE');
		expect(pack.country).toBe('BE');
		expect(pack.sourceName).toBe('Justel');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		const nature = pack.articles.find((a) => a.id === 'be_nature_especes');
		expect(nature?.url).toContain('1973A71207');
		expect(nature?.url).not.toContain('cgi_loi');
		expect(pack.articles.some((a) => a.id === 'be_bosdecreet')).toBe(true);
		expect(pack.articles.find((a) => a.id === 'be_bosdecreet')?.url).toContain('1003183');
	});

	it('exposes a BE species pack with regional vetoes for Daphne/Osmunda/Juniperus', () => {
		const pack = getSpeciesProtectionPack('BE');
		expect(pack?.country).toBe('BE');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toContain('Waarnemingen');
		for (const id of ['be_daphne', 'be_osmund', 'be_juniperus'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('regional');
		}
		const taxus = pack?.entries.find((e) => e.id === 'be_taxus');
		expect(taxus?.level).toBe('caution');
		expect(taxus?.scope).toBe('regional');
	});

	it('exposes CadGIS first on private; Flanders ANB second; Brussels ordinance last', () => {
		const links = getEuPermitLinks('BE', 'private');
		expect(links[0]?.id).toBe('be_cadgis');
		expect(links[0]?.url).toContain('cadgis');
		expect(links.find((l) => l.id === 'be_vlaanderen')?.url).toContain('soortenbescherming');
		expect(links.find((l) => l.id === 'be_spw')?.url).toContain('biodiversite.wallonie');
		expect(links.at(-1)?.id).toBe('be_brussels');
		expect(links.find((l) => l.id === 'be_brussels')?.url).toContain('2012031122');

		expect(resolveBeRegion({ commune: 'Gent' })).toBe('flanders');
		const gent = getEuPermitLinks('BE', 'private', { commune: 'Gent' });
		expect(gent[0]?.id).toBe('be_cadgis');
		expect(gent[1]?.id).toBe('be_vlaanderen');
		expect(gent.at(-1)?.id).toBe('be_brussels');

		const bru = getEuPermitLinks('BE', 'private', { commune: 'Bruxelles' });
		expect(bru[0]?.id).toBe('be_cadgis');
		expect(bru.at(-1)?.id).toBe('be_brussels');
	});

	it('exposes a CadGIS viewer deep link', () => {
		const link = getCadastreViewerLink('BE', 50.8503, 4.3517);
		expect(link?.url).toMatch(/cadgis/i);
	});
});
