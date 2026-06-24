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
	saveCachedGeocodeLabel
} from './geocodingCache';

describe('geocodingCache', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearGeocodeCache();
	});

	it('stores and retrieves geocode labels', async () => {
		await saveCachedGeocodeLabel(48.8566, 2.3522, 'Paris, Île-de-France');

		const label = await getCachedGeocodeLabel(48.85664, 2.35221);
		expect(label).toBe('Paris, Île-de-France');
	});
});
