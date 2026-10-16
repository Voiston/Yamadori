import { describe, expect, it } from 'vitest';
import { countTilesForBounds, getDownloadZoomLevels, getOfflinePackZoomLevels, offlinePackZoomLevels } from './tileCache';

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

	it('adds walking zooms 14 to 16 to the view zoom without gaps', () => {
		expect(getOfflinePackZoomLevels(12, 16)).toEqual([11, 12, 13, 14, 15, 16]);
		expect(getOfflinePackZoomLevels(12, 14)).toEqual([11, 12, 13, 14]);
	});

	it('adds detail zooms only up to the layer max', () => {
		expect(
			offlinePackZoomLevels(12, 19, { view: true, walk: true, detail: true })
		).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19]);
		expect(
			offlinePackZoomLevels(12, 16, { view: true, walk: true, detail: true })
		).toEqual([11, 12, 13, 14, 15, 16]);
		expect(offlinePackZoomLevels(12, 19, { view: false, walk: false, detail: true })).toEqual([
			17, 18, 19
		]);
	});
});
