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
	OFFLINE_PROTECTED_LIMIT,
	clearOfflineProtectedIndex,
	prefetchOfflineProtectedAreas,
	resolveProtectedIndex,
	type OfflineProtectedIndex,
	type StoredProtectedFeature
} from './offlineProtectedAreas';

const trace = [
	[2.3, 46.4],
	[2.6, 46.4],
	[2.6, 46.6],
	[2.3, 46.6],
	[2.3, 46.4]
] as LngLat[];

const coverage = {
	id: 'cov',
	ring: trace,
	complete: true,
	bbox: { west: 2.3, south: 46.4, east: 2.6, north: 46.6 }
};

function square(west: number, south: number, east: number, north: number): LngLat[][][] {
	return [
		[
			[
				[west, south],
				[east, south],
				[east, north],
				[west, north],
				[west, south]
			]
		]
	];
}

function znieff(polygons: LngLat[][][]): StoredProtectedFeature {
	return {
		id: 'znieff1|1',
		layerId: 'znieff1',
		cardId: 'znieff',
		bbox: { west: 2.45, south: 46.45, east: 2.55, north: 46.55 },
		polygons
	};
}

describe('resolveProtectedIndex', () => {
	it('clears every card inside a complete trace with no polygon', () => {
		const index: OfflineProtectedIndex = { features: [], coverages: [coverage] };
		const resolved = resolveProtectedIndex(index, null, 46.5, 2.5);
		expect(resolved.kind).toBe('ready');
		if (resolved.kind !== 'ready') return;
		expect(resolved.partial).toBe(false);
		expect(resolved.presence.znieff).toBe('clear');
		expect(resolved.presence.pn).toBe('clear');
	});

	it('marks ZNIEFF certain when the point is inside the polygon', () => {
		const index: OfflineProtectedIndex = {
			features: [znieff(square(2.45, 46.45, 2.55, 46.55))],
			coverages: [coverage]
		};
		const resolved = resolveProtectedIndex(index, null, 46.5, 2.5);
		expect(resolved.kind).toBe('ready');
		if (resolved.kind !== 'ready') return;
		expect(resolved.presence.znieff).toBe('certain');
		expect(resolved.presence.pn).toBe('clear');
	});

	it('misses a point outside every complete trace', () => {
		const index: OfflineProtectedIndex = { features: [], coverages: [coverage] };
		expect(resolveProtectedIndex(index, null, 46.9, 2.9)).toEqual({ kind: 'miss' });
	});

	it('does not conclude an empty scan on an incomplete trace', () => {
		const index: OfflineProtectedIndex = {
			features: [],
			coverages: [{ ...coverage, complete: false }]
		};
		expect(resolveProtectedIndex(index, null, 46.5, 2.5)).toEqual({ kind: 'miss' });
	});

	it('keeps a parcel overlap as potential inside a complete trace', () => {
		const index: OfflineProtectedIndex = {
			features: [
				{
					...znieff(square(2.48, 46.48, 2.6, 46.6)),
					bbox: { west: 2.48, south: 46.48, east: 2.6, north: 46.6 }
				}
			],
			coverages: [coverage]
		};
		const parcel = square(2.4, 46.4, 2.5, 46.5);
		const resolved = resolveProtectedIndex(index, parcel, 46.42, 2.42);
		expect(resolved.kind).toBe('ready');
		if (resolved.kind !== 'ready') return;
		expect(resolved.presence.znieff).toBe('potential');
	});
});

describe('prefetchOfflineProtectedAreas', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearOfflineProtectedIndex();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('stops at the feature cap and leaves the trace incomplete', async () => {
		const features = Array.from({ length: OFFLINE_PROTECTED_LIMIT + 1 }, (_, index) => ({
			geometry: {
				type: 'Polygon',
				coordinates: square(2.4 + index * 0.00001, 46.4, 2.4001 + index * 0.00001, 46.401)[0]
			}
		}));
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/nature/pn')) {
				return { ok: true, json: async () => ({ features }) } as Response;
			}
			return { ok: true, json: async () => ({ features: [] }) } as Response;
		});

		const result = await prefetchOfflineProtectedAreas(trace);
		expect(result.saved).toBe(OFFLINE_PROTECTED_LIMIT);
		expect(result.capped).toBe(true);
		expect(result.incomplete).toBe(false);
	});

	it('marks the trace incomplete when a page fails', async () => {
		vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));
		const result = await prefetchOfflineProtectedAreas(trace);
		expect(result.saved).toBe(0);
		expect(result.incomplete).toBe(true);
		expect(result.capped).toBe(false);
	});
});
