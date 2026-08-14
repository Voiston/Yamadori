import { beforeEach, describe, expect, it, vi } from 'vitest';

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
	clearGeocodeCache,
	getCachedGeocodeLabel,
	getCachedGeocodeRaw,
	getGeocodeCacheStats,
	MAX_GEOCODE_LABEL_CACHE_ENTRIES,
	MAX_GEOCODE_RAW_CACHE_ENTRIES,
	saveCachedGeocodeLabel,
	saveCachedGeocodeRaw
} from './geocodingCache';

describe('geocodingCache', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearGeocodeCache();
	});

	it('stores and retrieves geocode labels', async () => {
		await saveCachedGeocodeLabel(48.8566, 2.3522, 'Paris, Île-de-France', 'fr');

		const label = await getCachedGeocodeLabel(48.85664, 2.35221, 'fr');
		expect(label).toBe('Paris, Île-de-France');
	});

	it('partitions cache by language', async () => {
		await saveCachedGeocodeLabel(47.2184, -1.5536, 'Nantes, Loire-Atlantique', 'fr');
		await saveCachedGeocodeLabel(47.2184, -1.5536, 'Nantes, Loira Atlántica', 'es');

		expect(await getCachedGeocodeLabel(47.2184, -1.5536, 'fr')).toBe(
			'Nantes, Loire-Atlantique'
		);
		expect(await getCachedGeocodeLabel(47.2184, -1.5536, 'es')).toBe(
			'Nantes, Loira Atlántica'
		);
	});

	it('prunes label and raw budgets independently', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));

		for (let i = 0; i < MAX_GEOCODE_LABEL_CACHE_ENTRIES + 5; i += 1) {
			vi.setSystemTime(new Date(Date.UTC(2026, 5, 22, 12, 0, i)));
			await saveCachedGeocodeLabel(47 + i * 0.01, 2, `L${i}`, 'fr');
		}
		for (let i = 0; i < MAX_GEOCODE_RAW_CACHE_ENTRIES + 5; i += 1) {
			vi.setSystemTime(new Date(Date.UTC(2026, 5, 22, 13, 0, i)));
			await saveCachedGeocodeRaw(46 + i * 0.01, 3, 14, { display_name: `R${i}` }, 'fr');
		}

		const stats = await getGeocodeCacheStats();
		expect(stats.count).toBeLessThanOrEqual(
			MAX_GEOCODE_LABEL_CACHE_ENTRIES + MAX_GEOCODE_RAW_CACHE_ENTRIES
		);

		// Newest raw still present; labels did not wipe the raw bucket.
		expect(await getCachedGeocodeRaw(46 + MAX_GEOCODE_RAW_CACHE_ENTRIES * 0.01, 3, 14, 'fr')).toEqual(
			{ display_name: `R${MAX_GEOCODE_RAW_CACHE_ENTRIES}` }
		);
		expect(
			await getCachedGeocodeLabel(47 + MAX_GEOCODE_LABEL_CACHE_ENTRIES * 0.01, 2, 'fr')
		).toBe(`L${MAX_GEOCODE_LABEL_CACHE_ENTRIES}`);

		vi.useRealTimers();
	});
});
