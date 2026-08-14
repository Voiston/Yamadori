import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { apiSettingsState } from '$lib/stores/apiSettings.svelte';
import { reverseGeocode } from './geocoding';

describe('reverseGeocode', () => {
	beforeEach(() => {
		apiSettingsState.loaded = true;
		apiSettingsState.nominatim = true;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		memoryStore.clear();
		apiSettingsState.nominatim = true;
	});

	it('sends truncated coordinates to Nominatim', async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					display_name: 'Nantes, Loire-Atlantique',
					address: { city: 'Nantes', county: 'Loire-Atlantique' }
				}),
				{ status: 200 }
			)
		);
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('navigator', { onLine: true });

		const label = await reverseGeocode(47.269, -1.529);
		expect(label).toBe('Nantes, Loire-Atlantique');

		expect(fetchMock).toHaveBeenCalledOnce();
		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain('lat=47.26');
		expect(calledUrl).toContain('lon=-1.52');
		expect(calledUrl).toContain('zoom=14');
		expect(calledUrl).toContain('accept-language=');
	});

	it('falls back to zoom 18 when zoom 14 yields no label', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify({ display_name: '', address: {} }), { status: 200 })
			)
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify({
						display_name: 'Hamlet, County',
						address: { hamlet: 'Hamlet', county: 'County' }
					}),
					{ status: 200 }
				)
			);
		vi.stubGlobal('fetch', fetchMock);
		vi.stubGlobal('navigator', { onLine: true });

		const label = await reverseGeocode(47.269, -1.529);
		expect(label).toBe('Hamlet, County');
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(String(fetchMock.mock.calls[0]?.[0])).toContain('zoom=14');
		expect(String(fetchMock.mock.calls[1]?.[0])).toContain('zoom=18');
	});

	it('throws when Nominatim is disabled in settings', async () => {
		apiSettingsState.nominatim = false;
		vi.stubGlobal('navigator', { onLine: true });

		await expect(reverseGeocode(47.269, -1.529)).rejects.toThrow(/Nominatim/i);
	});
});
