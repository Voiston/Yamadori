import { describe, expect, it } from 'vitest';
import { countTilesForBounds } from './tileCache';
import {
	buildScreenDownloadRing,
	countTilesForPolygon,
	isClosedLasso,
	isNearLassoClose,
	pointInPolygon,
	polygonBounds,
	simplifyPath,
	snapLassoClose,
	svgEvenOddMaskPath,
	type LngLat
} from './downloadRegion';

describe('download region geometry', () => {
	it('keeps endpoints and drops colinear midpoints', () => {
		const simplified = simplifyPath(
			[
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 20, y: 0 },
				{ x: 30, y: 0 }
			],
			2
		);
		expect(simplified).toEqual([
			{ x: 0, y: 0 },
			{ x: 30, y: 0 }
		]);
	});

	it('treats a near-closed loop as a lasso', () => {
		const square = [
			{ x: 0, y: 0 },
			{ x: 100, y: 0 },
			{ x: 100, y: 100 },
			{ x: 0, y: 100 },
			{ x: 8, y: 4 }
		];
		expect(isClosedLasso(square)).toBe(true);
		const ring = buildScreenDownloadRing(square);
		expect(ring).not.toBeNull();
		expect(ring!.length).toBeGreaterThanOrEqual(4);
		const first = ring![0];
		const last = ring![ring!.length - 1];
		expect(first).toEqual(last);
	});

	it('buffers an open stroke into a corridor ring', () => {
		const line = [
			{ x: 0, y: 0 },
			{ x: 40, y: 0 },
			{ x: 80, y: 0 },
			{ x: 120, y: 0 }
		];
		expect(isClosedLasso(line)).toBe(false);
		const ring = buildScreenDownloadRing(line);
		expect(ring).not.toBeNull();
		expect(ring!.length).toBeGreaterThan(line.length);
	});

	it('rejects a scribble that is too small', () => {
		expect(
			buildScreenDownloadRing([
				{ x: 10, y: 10 },
				{ x: 12, y: 11 },
				{ x: 14, y: 10 }
			])
		).toBeNull();
	});

	it('snaps close only when the stroke is long and near the start', () => {
		const short = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 12, y: 4 },
			{ x: 4, y: 2 }
		];
		expect(isNearLassoClose(short)).toBe(false);

		const far = [
			{ x: 0, y: 0 },
			{ x: 80, y: 0 },
			{ x: 80, y: 80 },
			{ x: 0, y: 80 },
			{ x: 0, y: 140 }
		];
		expect(isNearLassoClose(far)).toBe(false);

		const near = [
			{ x: 0, y: 0 },
			{ x: 80, y: 0 },
			{ x: 80, y: 80 },
			{ x: 0, y: 80 },
			{ x: 10, y: 8 }
		];
		expect(isNearLassoClose(near)).toBe(true);
		const snapped = snapLassoClose(near);
		expect(snapped[snapped.length - 1]).toEqual(near[0]);
	});

	it('builds an even-odd mask with a viewport hole', () => {
		const ring = [
			{ x: 10, y: 10 },
			{ x: 40, y: 10 },
			{ x: 40, y: 40 },
			{ x: 10, y: 40 },
			{ x: 10, y: 10 }
		];
		const path = svgEvenOddMaskPath(ring, 100, 80);
		expect(path.startsWith('M0 0H100V80H0Z')).toBe(true);
		expect(path).toContain('M10.0 10.0');
		expect(path.trim().endsWith('Z')).toBe(true);
	});
});

describe('polygon tile coverage', () => {
	const square: LngLat[] = [
		[2.3, 48.86],
		[2.31, 48.86],
		[2.31, 48.85],
		[2.3, 48.85],
		[2.3, 48.86]
	];

	it('detects points inside and outside a ring', () => {
		expect(pointInPolygon([2.305, 48.855], square)).toBe(true);
		expect(pointInPolygon([2.4, 48.9], square)).toBe(false);
	});

	it('counts at least one tile for a small lasso', () => {
		expect(countTilesForPolygon(square, [14])).toBeGreaterThan(0);
	});

	it('counts fewer tiles for an L than for its bounding box', () => {
		const lRing: LngLat[] = [
			[2.3, 48.86],
			[2.32, 48.86],
			[2.32, 48.845],
			[2.38, 48.845],
			[2.38, 48.83],
			[2.3, 48.83],
			[2.3, 48.86]
		];
		const polyCount = countTilesForPolygon(lRing, [14]);
		const bboxCount = countTilesForBounds(polygonBounds(lRing), [14]);
		expect(polyCount).toBeGreaterThan(0);
		expect(polyCount).toBeLessThan(bboxCount);
	});
});
