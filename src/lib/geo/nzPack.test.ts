import { describe, expect, it } from 'vitest';
import { classifyDocPclHit, classifyDocPclHits } from '$lib/geo/providers/doc-pcl/classify';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findNzHarvestWindows } from '$lib/geo/nzHarvestCalendar';

describe('resolveCountry NZ', () => {
	it('resolves Auckland to NZ', () => {
		expect(resolveCountry(-36.8485, 174.7633)).toBe('NZ');
	});

	it('resolves Christchurch to NZ', () => {
		expect(resolveCountry(-43.5321, 172.6362)).toBe('NZ');
	});

	it('resolves Fiordland to NZ', () => {
		expect(resolveCountry(-45.0, 167.0)).toBe('NZ');
	});

	it('resolves Chatham Islands to NZ', () => {
		expect(resolveCountry(-43.9, -176.5)).toBe('NZ');
	});

	it('does not resolve Banff as NZ', () => {
		expect(resolveCountry(51.1784, -115.5708)).not.toBe('NZ');
	});

	it('does not resolve Sydney as NZ', () => {
		expect(resolveCountry(-33.8688, 151.2093)).not.toBe('NZ');
	});
});

describe('getGeoCapabilities NZ', () => {
	it('marks NZ as partial cadastre with full protected areas', () => {
		const caps = getGeoCapabilities('NZ');
		expect(caps.cadastre).toBe('partial');
		expect(caps.protectedAreas).toBe('full');
		expect(caps.speciesProtection).toBe('partial');
	});
});

describe('DOC PCL classify', () => {
	it('classifies National Park as national_park / forbidden', () => {
		const zone = classifyDocPclHit({
			name: 'Fiordland National Park',
			type: 'NATIONAL_PARK',
			section: 'S4_NATIONAL_PARK',
			legislation: 'NATIONAL_PARK_ACT',
			napalisId: '1',
			unitNumber: ''
		});
		expect(zone).toBe('national_park');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Whenua Rahui as tribal / forbidden', () => {
		const zone = classifyDocPclHit({
			name: 'Example Whenua Rahui',
			type: 'CONSERVATION_AREA',
			section: 'S58_WHENUA_RAHUI',
			legislation: 'CONSERVATION_ACT',
			napalisId: '2',
			unitNumber: ''
		});
		expect(zone).toBe('tribal');
		expect(collectStatusForZone(zone)).toBe('forbidden');
	});

	it('classifies Conservation Park as other_federal / forbidden_or_agency', () => {
		const zone = classifyDocPclHit({
			name: 'Example Conservation Park',
			type: 'CONSERVATION_AREA',
			section: 'S19_CONSERVATION_PARK',
			legislation: 'CONSERVATION_ACT',
			napalisId: '3',
			unitNumber: ''
		});
		expect(zone).toBe('other_federal');
		expect(collectStatusForZone(zone)).toBe('forbidden_or_agency');
	});

	it('defaults to crown_unverified / unknown with no hits', () => {
		const result = classifyDocPclHits([]);
		expect(result.zoneType).toBe('crown_unverified');
		expect(result.collectStatus).toBe('unknown');
	});
});

describe('NZ harvest calendar', () => {
	it('finds southern-hemisphere windows for Pohutukawa in Northland', () => {
		const windows = findNzHarvestWindows('Pohutukawa', 'nz_northland');
		expect(windows.length).toBeGreaterThan(0);
		expect(windows[0].startMonth).toBeGreaterThanOrEqual(5);
		expect(windows[0].startMonth).toBeLessThanOrEqual(8);
	});
});
