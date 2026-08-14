import { describe, expect, it } from 'vitest';
import type { Tree } from '$lib/types/tree';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { countTreesWithMissingPhotos } from './missingPhotos';

function baseTree(overrides: Partial<Tree> & Pick<Tree, 'id' | 'visits'>): Tree {
	return {
		species: 'Oak',
		notes: '',
		photos: [],
		voiceNote: null,
		latitude: 48.85,
		longitude: 2.35,
		accuracyMeters: 5,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		assessment: { ...DEFAULT_ASSESSMENT },
		capturedAt: '2026-01-01T12:00:00.000Z',
		...overrides
	};
}

describe('countTreesWithMissingPhotos', () => {
	it('returns 0 when visits have full photos', () => {
		const trees = [
			baseTree({
				id: 't1',
				photos: ['data:image/jpeg;base64,AAA'],
				visits: [
					{
						id: 'v1',
						visitedAt: '2026-01-01T12:00:00.000Z',
						note: '',
						photos: ['data:image/jpeg;base64,AAA']
					}
				]
			})
		];
		expect(countTreesWithMissingPhotos(trees)).toBe(0);
	});

	it('counts trees with empty photo slots after full load', () => {
		const trees = [
			baseTree({
				id: 't1',
				photos: [''],
				visits: [
					{
						id: 'v1',
						visitedAt: '2026-01-01T12:00:00.000Z',
						note: '',
						photos: [''],
						photoThumbs: ['data:image/jpeg;base64,thumb']
					}
				]
			}),
			baseTree({
				id: 't2',
				visits: [
					{
						id: 'v2',
						visitedAt: '2026-01-01T12:00:00.000Z',
						note: 'note only',
						photos: []
					}
				]
			})
		];
		expect(countTreesWithMissingPhotos(trees)).toBe(1);
	});

	it('counts trees with thumbs but no full photos', () => {
		const trees = [
			baseTree({
				id: 't1',
				visits: [
					{
						id: 'v1',
						visitedAt: '2026-01-01T12:00:00.000Z',
						note: '',
						photos: [],
						photoThumbs: ['data:image/jpeg;base64,thumb']
					}
				]
			})
		];
		expect(countTreesWithMissingPhotos(trees)).toBe(1);
	});
});
