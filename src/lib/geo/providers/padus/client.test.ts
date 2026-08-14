import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import { clearPadusPointCache, queryPadusFeeAt } from '$lib/geo/providers/padus/client';

describe('queryPadusFeeAt', () => {
	beforeEach(() => {
		clearPadusPointCache();
		apiSettingsState.loaded = true;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearPadusPointCache();
	});

	it('shares one network fetch for concurrent callers', async () => {
		const networkFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				features: [
					{
						attributes: {
							Mang_Name: 'NPS',
							Own_Name: 'NPS',
							Mang_Type: 'FED',
							Unit_Nm: 'Test Park',
							Des_Tp: 'NP',
							State_Nm: 'California'
						}
					}
				]
			})
		});
		vi.stubGlobal('fetch', networkFetch);

		const [a, b] = await Promise.all([
			queryPadusFeeAt(37.8, -122.4),
			queryPadusFeeAt(37.8, -122.4)
		]);

		expect(networkFetch).toHaveBeenCalledTimes(1);
		expect(a).toHaveLength(1);
		expect(b).toHaveLength(1);
		expect(a[0].unitName).toBe('Test Park');
	});

	it('serves a second sequential call from memory without another fetch', async () => {
		const networkFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ features: [] })
		});
		vi.stubGlobal('fetch', networkFetch);

		await queryPadusFeeAt(40.0, -105.0);
		await queryPadusFeeAt(40.0, -105.0);

		expect(networkFetch).toHaveBeenCalledTimes(1);
	});
});
