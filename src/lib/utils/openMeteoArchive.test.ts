import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import {
	fetchGddArchiveDailyMeans,
	fetchOpenMeteoArchiveDailyBundle,
	getClimateDateRange
} from '$lib/utils/openMeteoArchive';

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

describe('openMeteo archive climate+GDD coalesce', () => {
	beforeEach(() => {
		memoryStore.clear();
		apiSettingsState.loaded = true;
		apiSettingsState.openMeteoArchive = true;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('shares one archive request when climate and GDD load the same grid', async () => {
		const times = ['2026-01-01', '2026-01-02', '2026-06-01'];
		const networkFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				daily: {
					time: times,
					temperature_2m_min: [1, 2, 3],
					precipitation_sum: [0, 1, 0],
					temperature_2m_mean: [5, 6, 7]
				}
			})
		});
		vi.stubGlobal('fetch', networkFetch);

		const range = getClimateDateRange(new Date('2026-07-20T12:00:00Z'));

		await Promise.all([
			fetchOpenMeteoArchiveDailyBundle(47.27, -1.53, range.startDate, range.endDate),
			fetchGddArchiveDailyMeans(47.27, -1.53, new Date('2026-07-20T12:00:00Z'))
		]);

		expect(networkFetch).toHaveBeenCalledTimes(1);
		const url = String(networkFetch.mock.calls[0][0]);
		expect(url).toContain('temperature_2m_min');
		expect(url).toContain('precipitation_sum');
		expect(url).toContain('temperature_2m_mean');
	});
});
