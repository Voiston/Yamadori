import { describe, expect, it } from 'vitest';
import { classifyCpcadHit, classifyCpcadHits } from '$lib/geo/providers/cpcad/classify';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findCaHarvestWindows } from '$lib/geo/caHarvestCalendar';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getCaPermitLinks, resolveCaProvince } from '$lib/geo/legal/caPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { getMapProvider } from '$lib/geo/providers/map/registry';
import { caZoneCardIds } from '$lib/geo/providers/protected/ca';

describe('resolveCountry CA / US border', () => {
	it('resolves Vancouver to CA', () => {
		expect(resolveCountry(49.2827, -123.1207)).toBe('CA');
	});

	it('resolves Seattle to US', () => {
		expect(resolveCountry(47.6062, -122.3321)).toBe('US');
	});

	it('resolves Montreal to CA', () => {
		expect(resolveCountry(45.5017, -73.5673)).toBe('CA');
	});

	it('resolves New York to US', () => {
		expect(resolveCountry(40.7128, -74.006)).toBe('US');
	});

	it('resolves Windsor to CA', () => {
		expect(resolveCountry(42.314, -83.036)).toBe('CA');
	});

	it('resolves Detroit to US', () => {
		expect(resolveCountry(42.331, -83.046)).toBe('US');
	});

	it('resolves Anchorage to US', () => {
		expect(resolveCountry(61.2181, -149.9003)).toBe('US');
	});

	it('resolves Whitehorse to CA', () => {
		expect(resolveCountry(60.7212, -135.0568)).toBe('CA');
	});

	it('resolves Banff to CA', () => {
		expect(resolveCountry(51.1784, -115.5708)).toBe('CA');
	});
});

describe('getGeoCapabilities CA', () => {
	it('marks CA as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('CA');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('CA map / legal / species / permits', () => {
	it('uses CPCAD overlay', () => {
		const provider = getMapProvider('CA');
		expect(provider.plan.tiles[0]).toContain('opentopomap.org');
		expect(provider.protectedAreasOverlay).not.toBeNull();
		expect(provider.protectedAreasOverlay?.tiles[0]).toContain('CPCAD');
	});

	it('exposes CA legal pack with NRCan forest laws and SARA search', () => {
		const pack = getLegalContentPack('CA');
		expect(pack.country).toBe('CA');
		expect(pack.articles.length).toBeGreaterThanOrEqual(4);
		expect(pack.articles.find((a) => a.id === 'ca_crown_forests')?.url).toContain(
			'natural-resources.canada.ca'
		);
		expect(pack.articles.find((a) => a.id === 'ca_crown_forests')?.url).not.toContain('/17595');
		expect(pack.articles.find((a) => a.id === 'ca_national_parks')?.url).toContain('n-14.01');
		expect(pack.speciesSourceName).toMatch(/SARA/i);
		expect(pack.speciesSearchBase).toContain('species-registry.canada.ca');
		expect(pack.buildSpeciesSearchUrl?.('Pinus albicaulis')).toContain('species-registry.canada.ca');
		expect(pack.buildSpeciesSearchUrl?.('Pinus albicaulis')).not.toContain('gbif.org');
	});

	it('exposes CA species pack with SARA veto levels', () => {
		const pack = getSpeciesProtectionPack('CA');
		expect(pack?.country).toBe('CA');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/SARA/i);
		for (const id of [
			'ca_american_chestnut',
			'ca_butternut',
			'ca_whitebark',
			'ca_eastern_flowering_dogwood',
			'ca_red_mulberry'
		] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		const limber = pack?.entries.find((e) => e.id === 'ca_limber');
		expect(limber?.level).toBe('caution');
		expect(limber?.scope).toBe('regional');
	});

	it('exposes deep Crown and provincial park hubs without Google', () => {
		expect(resolveCaProvince('ON')).toBe('ON');
		const ab = getCaPermitLinks({ zoneType: 'crown_unverified', provinceCode: 'AB' });
		expect(ab.find((l) => l.id === 'crown_AB')?.url).toContain('public-land-recreation');
		expect(ab.find((l) => l.id === 'fcm_municipalities')?.url).toContain('fcm.ca');
		expect(ab.every((l) => !l.url.includes('google.com'))).toBe(true);

		const on = getCaPermitLinks({ zoneType: 'crown_unverified', provinceCode: 'ON' });
		expect(on.find((l) => l.id === 'crown_ON')?.url).toContain('ontario.ca/page/crown-land');

		const priv = getCaPermitLinks({ zoneType: 'private' });
		expect(priv[0]?.id).toBe('fcm_municipalities');
		expect(priv.find((l) => l.id === 'cpcad')).toBeTruthy();
		expect(priv.every((l) => !String(l.id).startsWith('crown_'))).toBe(true);

		const bcPark = getCaPermitLinks({ zoneType: 'provincial_park', provinceCode: 'BC' });
		expect(bcPark[0]?.url).toContain('bcparks.ca');
		expect(bcPark.every((l) => !l.url.includes('google.com'))).toBe(true);

		const qcPark = getCaPermitLinks({ zoneType: 'provincial_park', provinceCode: 'QC' });
		expect(qcPark[0]?.url).toContain('sepaq.com');

		const onPark = getCaPermitLinks({ zoneType: 'provincial_park', provinceCode: 'ON' });
		expect(onPark[0]?.url).toContain('ontarioparks.ca');

		const nps = getCaPermitLinks({ zoneType: 'national_park' });
		expect(nps[0]?.url).toContain('pc.gc.ca');
	});

	it('exposes CPCAD viewer via OSM GPS hand-off', () => {
		const link = getCadastreViewerLink('CA', 45.42, -75.69);
		expect(link?.label).toContain('Geo.ca');
		expect(link?.url).toContain('openstreetmap.org/#map=17/45.420000/-75.690000');
	});

	it('includes wilderness in CA zone card checklist', () => {
		expect(caZoneCardIds()).toContain('wilderness');
		expect(caZoneCardIds()).toContain('crown_unverified');
	});
});

describe('CPCAD classify', () => {
	it('classifies Banff-like National Park as national_park / forbidden', () => {
		const zone = classifyCpcadHit({
			nameEn: 'Banff National Park Of Canada',
			nameFr: 'Parc national du Canada Banff',
			typeEn: 'National Park',
			iucnCat: 3,
			owner: 'Parks Canada Agency',
			manager: 'Parks Canada Agency',
			ipca: false,
			jurId: 'PCA',
			mechanism: 'Canada National Parks Act',
			paOecm: 1
		});
		expect(zone).toBe('national_park');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies IPCA as ipca / forbidden', () => {
		const zone = classifyCpcadHit({
			nameEn: 'Example IPCA',
			nameFr: '',
			typeEn: 'Indigenous Protected and Conserved Area',
			iucnCat: null,
			owner: 'Indigenous government',
			manager: 'Indigenous government',
			ipca: true,
			jurId: 'BC',
			mechanism: '',
			paOecm: 1
		});
		expect(zone).toBe('ipca');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('defaults to crown_unverified / unknown with no hits', () => {
		const result = classifyCpcadHits([]);
		expect(result.zoneType).toBe('crown_unverified');
		expect(result.collectStatus).toBe('unknown');
	});
});

describe('CA harvest calendar', () => {
	it('finds windows for Douglas fir on BC coast', () => {
		const windows = findCaHarvestWindows('Douglas fir', 'ca_bc_coast');
		expect(windows.length).toBeGreaterThan(0);
	});

	it('finds windows for Eastern white cedar in Québec', () => {
		const windows = findCaHarvestWindows('Eastern white cedar', 'ca_quebec');
		expect(windows.length).toBeGreaterThan(0);
	});
});

describe('CA i18n UTF-8', () => {
	it('has no U+FFFD in English CA disclaimer and species examples', async () => {
		const en = await import('../../../messages/en.json');
		const note = en.default.veto_disclaimer_note_ca as string;
		const title = en.default.veto_species_examples_title_ca as string;
		const body = en.default.veto_species_examples_body_ca as string;
		expect(note).not.toContain('\uFFFD');
		expect(title).not.toContain('\uFFFD');
		expect(body).not.toContain('\uFFFD');
		expect(note.toLowerCase()).toContain('parks canada');
		expect(note.toLowerCase()).toContain('no link authorizes');
		expect(body.toLowerCase()).toContain('sara');
		expect(body.toLowerCase()).toContain('butternut');
	});
});
