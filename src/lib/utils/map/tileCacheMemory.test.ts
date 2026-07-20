import { describe, expect, it } from 'vitest';
import { MemoryTileCache } from './tileCacheMemory';

function tile(bytes: number, cachedAt = Date.now()) {
	return {
		data: new ArrayBuffer(bytes),
		cachedAt,
		contentType: 'image/png'
	};
}

describe('MemoryTileCache', () => {
	it('returns a hit and refreshes LRU order', () => {
		const cache = new MemoryTileCache(2, 10_000, 60_000);
		cache.put('a', tile(100));
		cache.put('b', tile(100));

		expect(cache.get('a')).not.toBeNull();
		cache.put('c', tile(100));

		expect(cache.get('a')).not.toBeNull();
		expect(cache.get('b')).toBeNull();
	});

	it('evicts by total byte budget', () => {
		const cache = new MemoryTileCache(10, 250, 60_000);
		cache.put('a', tile(100));
		cache.put('b', tile(100));
		cache.put('c', tile(100));

		expect(cache.size).toBe(2);
		expect(cache.get('a')).toBeNull();
	});

	it('drops expired entries', () => {
		const cache = new MemoryTileCache(10, 10_000, 1_000);
		cache.put('a', tile(100, 1_000));

		expect(cache.get('a', 3_000)).toBeNull();
	});
});
