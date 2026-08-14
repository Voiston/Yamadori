import { describe, expect, it } from 'vitest';
import {
	applyTileCacheStatsOnAdd,
	applyTileCacheStatsOnRemove,
	applyTileCacheStatsOnReplace,
	createEmptyTileCacheStats
} from './tileCacheStats';

describe('tile cache stats metadata', () => {
	it('tracks count and bytes on add', () => {
		const next = applyTileCacheStatsOnAdd(createEmptyTileCacheStats(100), 512, 200, 100);
		expect(next).toEqual({
			count: 1,
			bytes: 512,
			oldestAt: 200,
			updatedAt: 100
		});
	});

	it('adjusts bytes on replace without changing count', () => {
		const base = applyTileCacheStatsOnAdd(createEmptyTileCacheStats(), 100, 1);
		const next = applyTileCacheStatsOnReplace(base, 100, 250);
		expect(next.count).toBe(1);
		expect(next.bytes).toBe(250);
	});

	it('clears oldestAt when the oldest tile is removed', () => {
		const base = applyTileCacheStatsOnAdd(createEmptyTileCacheStats(), 100, 50);
		const next = applyTileCacheStatsOnRemove(base, 100, 50);
		expect(next.count).toBe(0);
		expect(next.bytes).toBe(0);
		expect(next.oldestAt).toBeNull();
	});
});
