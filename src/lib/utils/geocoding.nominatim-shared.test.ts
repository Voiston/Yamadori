import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

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

describe('nominatimReverseRaw shared throttle', () => {
	beforeEach(() => {
		memoryStore.clear();
		apiSettingsState.loaded = true;
		apiSettingsState.nominatim = true;
		vi.stubGlobal('navigator', { onLine: true });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('coalesces concurrent reverse calls for the same grid', async () => {
		const networkFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				display_name: 'Testville, Testland',
				address: { village: 'Testville', state: 'Testland' }
			})
		});
		vi.stubGlobal('fetch', networkFetch);

		const [a, b] = await Promise.all([
			nominatimReverseRaw(47.27, -1.53, { zoom: 14 }),
			nominatimReverseRaw(47.27, -1.53, { zoom: 14 })
		]);

		expect(networkFetch).toHaveBeenCalledTimes(1);
		expect(a?.address?.village).toBe('Testville');
		expect(b?.address?.village).toBe('Testville');
	});
});
