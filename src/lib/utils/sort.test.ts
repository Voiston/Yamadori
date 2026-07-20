import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import type { Tree } from '$lib/types/tree';
import { buildTreeDistanceMap, sortTrees } from './sort';

function makeTree(
	id: string,
	overrides: Partial<Tree> = {}
): Tree {
	return {
		id,
		species: 'Pin',
		notes: '',
		photos: [],
		visits: [],
		assessment: DEFAULT_ASSESSMENT,
		voiceNote: null,
		latitude: null,
		longitude: null,
		accuracyMeters: null,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: 'OPEN',
		yrsAtCapture: null,
		capturedAt: '2025-01-01T00:00:00.000Z',
		...overrides
	};
}

const userPosition = { latitude: 45.0, longitude: 2.0 };

describe('buildTreeDistanceMap', () => {
	it('omits trees without coordinates', () => {
		const trees = [
			makeTree('near', { latitude: 45.001, longitude: 2.0 }),
			makeTree('no-coords')
		];

		const map = buildTreeDistanceMap(trees, userPosition);

		expect(map.has('near')).toBe(true);
		expect(map.has('no-coords')).toBe(false);
	});

	it('stores haversine distance in meters', () => {
		const trees = [makeTree('near', { latitude: 45.001, longitude: 2.0 })];
		const map = buildTreeDistanceMap(trees, userPosition);

		expect(map.get('near')).toBeGreaterThan(0);
		expect(map.get('near')).toBeLessThan(200);
	});
});

describe('sortTrees distance sort', () => {
	const trees = [
		makeTree('far', { latitude: 45.01, longitude: 2.0 }),
		makeTree('near', { latitude: 45.001, longitude: 2.0 }),
		makeTree('mid', { latitude: 45.005, longitude: 2.0 })
	];

	it('orders by ascending distance', () => {
		expect(sortTrees(trees, 'distance_asc', userPosition).map((tree) => tree.id)).toEqual([
			'near',
			'mid',
			'far'
		]);
	});

	it('orders by descending distance', () => {
		expect(sortTrees(trees, 'distance_desc', userPosition).map((tree) => tree.id)).toEqual([
			'far',
			'mid',
			'near'
		]);
	});

	it('matches precomputed distance map ordering', () => {
		const distanceMap = buildTreeDistanceMap(trees, userPosition);

		expect(sortTrees(trees, 'distance_asc', userPosition, distanceMap).map((tree) => tree.id)).toEqual(
			sortTrees(trees, 'distance_asc', userPosition).map((tree) => tree.id)
		);
	});
});

describe('sortTrees favorites', () => {
	it('keeps favorites before non-favorites regardless of sort key', () => {
		const trees = [
			makeTree('regular-near', { latitude: 45.001, longitude: 2.0 }),
			makeTree('favorite-far', {
				latitude: 45.01,
				longitude: 2.0,
				isFavorite: true
			})
		];

		expect(sortTrees(trees, 'distance_asc', userPosition).map((tree) => tree.id)).toEqual([
			'favorite-far',
			'regular-near'
		]);
	});
});
