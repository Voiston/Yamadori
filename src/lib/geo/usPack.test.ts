import { describe, expect, it } from 'vitest';
import { classifyPadusHit, classifyPadusHits } from '$lib/geo/providers/padus/classify';
import { collectStatusForZone, mergeCollectStatus } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findUsHarvestWindows } from '$lib/geo/usHarvestCalendar';
import { getLegalContentPack } from '$lib/geo/legal';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import { getUsPermitLinks, resolveUsState } from '$lib/geo/legal/usPermitLinks';
import { getCadastreViewerLink } from '$lib/utils/cadastreViewer';
import { getMapProvider } from '$lib/geo/providers/map/registry';

describe('resolveCountry US', () => {
	it('resolves Denver to US', () => {
		expect(resolveCountry(39.7392, -104.9903)).toBe('US');
	});

	it('resolves Anchorage to US via extra bbox', () => {
		expect(resolveCountry(61.2181, -149.9003)).toBe('US');
	});

	it('resolves Honolulu to US via extra bbox', () => {
		expect(resolveCountry(21.3069, -157.8583)).toBe('US');
	});
});

describe('getGeoCapabilities US', () => {
	it('marks US as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('US');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.municipality).toBe('partial');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('US map / legal / species / permits', () => {
	it('uses USGS Topo with PAD overlay', () => {
		const provider = getMapProvider('US');
		expect(provider.plan.tiles[0]).toMatch(/usgs|basemap/i);
		expect(provider.protectedAreasOverlay).not.toBeNull();
	});

	it('exposes US legal pack with BLM permits, 36 CFR 2.1 and ECOS search', () => {
		const pack = getLegalContentPack('US');
		expect(pack.country).toBe('US');
		expect(pack.articles.length).toBeGreaterThanOrEqual(5);
		expect(pack.articles.every((a) => !a.url.includes('blm.gov/office') || a.url.includes('national-office'))).toBe(
			true
		);
		expect(pack.articles.find((a) => a.id === 'us_blm_plants')?.url).toContain('forest-product-permits');
		expect(pack.articles.find((a) => a.id === 'us_nps_prohibited')?.url).toContain('section-2.1');
		expect(pack.articles.find((a) => a.id === 'us_esa_plants')?.url).toContain('ecos.fws.gov');
		expect(pack.speciesSearchBase).toContain('ecos.fws.gov');
		expect(pack.buildSpeciesSearchUrl?.('Pinus albicaulis')).toContain('ecos.fws.gov');
		expect(pack.buildSpeciesSearchUrl?.('Pinus albicaulis')).not.toContain('gbif.org');
	});

	it('exposes US species pack with ESA veto levels', () => {
		const pack = getSpeciesProtectionPack('US');
		expect(pack?.country).toBe('US');
		expect(pack?.entries.length).toBeGreaterThanOrEqual(8);
		expect(pack?.sourceName).toMatch(/ECOS/i);
		for (const id of ['us_florida_torreya', 'us_whitebark'] as const) {
			const entry = pack?.entries.find((e) => e.id === id);
			expect(entry?.level).toBe('veto');
			expect(entry?.scope).toBe('national');
		}
		const torrey = pack?.entries.find((e) => e.id === 'us_torrey_pine');
		expect(torrey?.level).toBe('veto');
		expect(torrey?.scope).toBe('regional');
	});

	it('exposes deep BLM permits and state hubs without Google', () => {
		const blm = getUsPermitLinks({ zoneType: 'blm' });
		expect(blm.find((l) => l.id === 'blm_permits')?.url).toContain('forest-product-permits');
		expect(blm.find((l) => l.id === 'blm_online')?.url).toContain('forestproducts.blm.gov');
		expect(blm.every((l) => !l.url.includes('/office/search'))).toBe(true);
		expect(blm.every((l) => l.url !== 'https://www.blm.gov/office')).toBe(true);

		expect(resolveUsState('CA')).toBe('CA');
		const ca = getUsPermitLinks({ zoneType: 'state_park', stateCode: 'CA' });
		expect(ca[0]?.url).toContain('parks.ca.gov');
		expect(ca.every((l) => !l.url.includes('google.com'))).toBe(true);

		const co = getUsPermitLinks({ zoneType: 'state_land', stateCode: 'CO' });
		expect(co[0]?.url).toContain('cpw.state.co.us');

		const nps = getUsPermitLinks({ zoneType: 'national_park' });
		expect(nps[0]?.url).toContain('section-2.1');

		const priv = getUsPermitLinks({ zoneType: 'private' });
		expect(priv).toHaveLength(1);
		expect(priv[0]?.id).toBe('owner');
		expect(priv[0]?.label).toMatch(/assessor|property records/i);
		expect(priv[0]?.url).toContain('explorer.naco.org');
		expect(priv[0]?.url).not.toContain('law.cornell.edu');
	});

	it('exposes PAD-US viewer via OSM GPS hand-off', () => {
		const link = getCadastreViewerLink('US', 39.74, -104.99);
		expect(link?.label).toContain('PAD-US');
		expect(link?.url).toContain('openstreetmap.org/#map=17/39.740000/-104.990000');
	});
});

describe('PAD-US classify', () => {
	it('classifies NPS as national_park / forbidden', () => {
		const zone = classifyPadusHit({
			managerName: 'NPS',
			ownerName: 'NPS',
			managerType: 'FED',
			unitName: 'Yosemite National Park',
			designation: 'NP',
			stateName: 'California'
		});
		expect(zone).toBe('national_park');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies USFS as national_forest / permit_required', () => {
		const zone = classifyPadusHit({
			managerName: 'USFS',
			ownerName: 'USFS',
			managerType: 'FED',
			unitName: 'Pike National Forest',
			designation: 'NF',
			stateName: 'Colorado'
		});
		expect(zone).toBe('national_forest');
		expect(collectStatusForZone(zone)).toBe('permit_required');
	});

	it('classifies BLM as blm', () => {
		expect(
			classifyPadusHit({
				managerName: 'BLM',
				ownerName: 'BLM',
				managerType: 'FED',
				unitName: 'Moab Field Office',
				designation: 'PUB',
				stateName: 'Utah'
			})
		).toBe('blm');
	});

	it('classifies FWS as national_wildlife_area / forbidden', () => {
		const zone = classifyPadusHit({
			managerName: 'FWS',
			ownerName: 'FWS',
			managerType: 'FED',
			unitName: 'Arctic National Wildlife Refuge',
			designation: 'NWR',
			stateName: 'Alaska'
		});
		expect(zone).toBe('national_wildlife_area');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('prefers wilderness over national forest when both present', () => {
		const result = classifyPadusHits([
			{
				managerName: 'USFS',
				ownerName: 'USFS',
				managerType: 'FED',
				unitName: 'Some NF',
				designation: 'NF',
				stateName: 'Colorado'
			},
			{
				managerName: 'USFS',
				ownerName: 'USFS',
				managerType: 'FED',
				unitName: 'Some Wilderness',
				designation: 'WA',
				stateName: 'Colorado'
			}
		]);
		expect(result.zoneType).toBe('wilderness');
		expect(result.collectStatus).toBe('forbidden');
		expect(result.stateCode).toBe('CO');
	});

	it('defaults to private / owner_permission with no hits', () => {
		const result = classifyPadusHits([]);
		expect(result.zoneType).toBe('private');
		expect(result.collectStatus).toBe('owner_permission');
	});
});

describe('mergeCollectStatus', () => {
	it('picks the most restrictive status', () => {
		expect(mergeCollectStatus('owner_permission', 'permit_required', 'forbidden')).toBe(
			'forbidden'
		);
	});
});

describe('US harvest calendar', () => {
	it('finds windows for ponderosa in rockies', () => {
		const windows = findUsHarvestWindows('Ponderosa pine', 'us_rockies');
		expect(windows.length).toBeGreaterThan(0);
		expect(windows[0].startMonth).toBe(10);
	});
});

describe('US i18n UTF-8', () => {
	it('has no U+FFFD in English US disclaimer', async () => {
		const en = await import('../../../messages/en.json');
		const note = en.default.veto_disclaimer_note_us as string;
		expect(note).not.toContain('\uFFFD');
		expect(note.toLowerCase()).toContain('usfs');
		expect(note.toLowerCase()).toContain('no link authorizes');
	});
});
