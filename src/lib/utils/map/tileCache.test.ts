import { describe, expect, it } from 'vitest';
import { countTilesForBounds, getDownloadZoomLevels } from './tileCache';

describe('tile download helpers', () => {
	it('counts tiles for a small bounds at one zoom', () => {
		const count = countTilesForBounds(
			{ west: 2.3, south: 48.8, east: 2.35, north: 48.85 },
			[14]
		);
		expect(count).toBeGreaterThan(0);
		expect(count).toBeLessThan(500);
	});

	it('returns adjacent zoom levels capped by max zoom', () => {
		expect(getDownloadZoomLevels(14.2, 16)).toEqual([13, 14]);
		expect(getDownloadZoomLevels(10.8, 16)).toEqual([10, 11]);
	});
});
