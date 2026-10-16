import { describe, expect, it } from 'vitest';
import type { LngLat } from '$lib/utils/map/downloadRegion';
import { forecastPointsForRing } from './offlineForecastGrid';

const smallRing: LngLat[] = [
	[2.3, 48.84],
	[2.32, 48.84],
	[2.32, 48.86],
	[2.3, 48.86]
];

const wideRing: LngLat[] = [
	[2.0, 48.0],
	[2.8, 48.0],
	[2.8, 48.6],
	[2.0, 48.6]
];

describe('forecastPointsForRing', () => {
	it('asks for one forecast when the zone is inside 30 km', () => {
		expect(forecastPointsForRing(smallRing)).toHaveLength(1);
	});

	it('adds grid points when the zone is wider than 30 km', () => {
		expect(forecastPointsForRing(wideRing).length).toBeGreaterThan(1);
	});
});
