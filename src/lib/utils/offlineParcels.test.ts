import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LngLat } from '$lib/utils/map/downloadRegion';

const memoryStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
	createStore: () => ({}),
	get: vi.fn(async (key: string) => memoryStore.get(String(key))),
	set: vi.fn(async (key: string, value: unknown) => {
		memoryStore.set(String(key), value);
	}),
	del: vi.fn(async (key: string) => {
		memoryStore.delete(String(key));
	}),
	keys: vi.fn(async () => [...memoryStore.keys()])
}));

import {
	OFFLINE_PARCEL_LIMIT,
	clearOfflineParcelIndex,
	parcelAtPoint,
	prefetchOfflineParcels,
	simplifyRing,
	type OfflineParcelIndex
} from './offlineParcels';

const square: LngLat[][][] = [
	[
		[
			[2.35, 48.85],
			[2.36, 48.85],
			[2.36, 48.86],
			[2.35, 48.86],
			[2.35, 48.85]
		]
	]
];

function indexWith(
	polygons: LngLat[][][],
	forests: OfflineParcelIndex['forests'] = []
): OfflineParcelIndex {
	return {
		parcels: [
			{
				id: '75056|ZC|42',
				commune: 'Paris',
				section: 'ZC',
				parcelNumber: '42',
				codeInsee: '75056',
				bbox: { west: 2.35, south: 48.85, east: 2.36, north: 48.86 },
				polygons
			}
		],
		forests
	};
}

describe('parcelAtPoint', () => {
	it('returns the parcel inside the polygon and null outside it', () => {
		const index = indexWith(square);
		expect(parcelAtPoint(index, 48.8566, 2.3522)).toMatchObject({
			section: 'ZC',
			parcelNumber: '42'
		});
		expect(parcelAtPoint(index, 48.9, 2.4)).toBeNull();
	});

	it('ignores a point that falls in a hole', () => {
		const withHole: LngLat[][][] = [
			[
				square[0][0],
				[
					[2.351, 48.855],
					[2.355, 48.855],
					[2.355, 48.858],
					[2.351, 48.858],
					[2.351, 48.855]
				]
			]
		];
		const index = indexWith(withHole);
		expect(parcelAtPoint(index, 48.8566, 2.3522)).toBeNull();
		expect(parcelAtPoint(index, 48.859, 2.358)).toMatchObject({ parcelNumber: '42' });
	});

	it('attaches public-forest properties when the point is inside a forest', () => {
		const index = indexWith(square, [
			{
				id: 'forest',
				properties: { regime: 'Domanial' },
				bbox: { west: 2.35, south: 48.85, east: 2.36, north: 48.86 },
				polygons: square
			}
		]);
		expect(parcelAtPoint(index, 48.8566, 2.3522)?.forestProperties).toEqual({
			regime: 'Domanial'
		});
	});
});

describe('simplifyRing', () => {
	it('shrinks a ring past the stored point budget', () => {
		const ring: LngLat[] = [];
		for (let i = 0; i < 2500; i += 1) ring.push([i / 2500, 0]);
		expect(simplifyRing(ring, 2000).length).toBeLessThanOrEqual(2000);
	});
});

describe('prefetchOfflineParcels', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearOfflineParcelIndex();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('stops at the parcel cap', async () => {
		const features = Array.from({ length: OFFLINE_PARCEL_LIMIT + 1 }, (_, index) => ({
			properties: {
				section: 'AB',
				numero: String(index + 1),
				code_insee: '75056',
				nom_com: 'Paris'
			},
			geometry: { type: 'Polygon', coordinates: square[0] }
		}));
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				return { ok: true, json: async () => ({ features }) } as Response;
			}
			return { ok: true, json: async () => ({ features: [] }) } as Response;
		});

		const result = await prefetchOfflineParcels(square[0][0]);
		expect(result.saved).toBe(OFFLINE_PARCEL_LIMIT);
		expect(result.capped).toBe(true);
	});

	it('asks for the next page when the first page is full', async () => {
		let parcelCalls = 0;
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				parcelCalls += 1;
				const count = parcelCalls === 1 ? 500 : 1;
				const features = Array.from({ length: count }, (_, index) => ({
					properties: {
						section: 'AB',
						numero: String(parcelCalls * 1000 + index),
						code_insee: '75056'
					},
					geometry: { type: 'Polygon', coordinates: square[0] }
				}));
				return { ok: true, json: async () => ({ features }) } as Response;
			}
			return { ok: true, json: async () => ({ features: [] }) } as Response;
		});

		const result = await prefetchOfflineParcels(square[0][0]);
		expect(parcelCalls).toBe(2);
		expect(result.saved).toBe(501);
		expect(result.capped).toBe(false);
	});
});
