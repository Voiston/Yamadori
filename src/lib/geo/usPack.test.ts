import { describe, expect, it } from 'vitest';
import { classifyPadusHit, classifyPadusHits } from '$lib/geo/providers/padus/classify';
import { collectStatusForZone, mergeCollectStatus } from '$lib/geo/legal/usCollectStatus';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { getGeoCapabilities } from '$lib/geo/capabilities';
import { findUsHarvestWindows } from '$lib/geo/usHarvestCalendar';

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
