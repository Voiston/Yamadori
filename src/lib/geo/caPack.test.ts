import { describe, expect, it } from 'vitest';
import { classifyCpcadHit, classifyCpcadHits } from '$lib/geo/providers/cpcad/classify';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findCaHarvestWindows } from '$lib/geo/caHarvestCalendar';

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
		expect(caps.speciesProtection).toBe('partial');
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
