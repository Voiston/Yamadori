import { describe, expect, it } from 'vitest';
import {
	MAX_VISIT_PHOTOS,
	clampVisitPhotos,
	collectPhotosFromVisits,
	normalizeVisitPhotoFields,
	type TreeVisit
} from '$lib/types/tree';

describe('visit photo helpers', () => {
	it('clamps to MAX_VISIT_PHOTOS', () => {
		expect(MAX_VISIT_PHOTOS).toBe(3);
		expect(clampVisitPhotos(['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c']);
	});

	it('normalizes legacy photoBase64', () => {
		expect(normalizeVisitPhotoFields({ photoBase64: 'data:x' })).toEqual({
			photos: ['data:x'],
			photoThumbs: undefined
		});
	});

	it('keeps thumbs when photos are empty placeholders', () => {
		expect(
			normalizeVisitPhotoFields({
				photos: ['', ''],
				photoThumbs: ['thumb-a', 'thumb-b']
			})
		).toEqual({
			photos: ['', ''],
			photoThumbs: ['thumb-a', 'thumb-b']
		});
	});

	it('collects all photos from a multi-photo visit', () => {
		const visits: TreeVisit[] = [
			{
				id: 'v1',
				visitedAt: '2026-01-01T00:00:00.000Z',
				note: '',
				photos: ['p1', 'p2', 'p3']
			}
		];
		expect(collectPhotosFromVisits(visits)).toEqual(['p1', 'p2', 'p3']);
	});
});
