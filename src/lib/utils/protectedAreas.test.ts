import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
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
	clearProtectedAreasPersistentCache,
	getCachedProtectedAreaScan
} from '$lib/utils/protectedAreasCache';
import { clearOfflineProtectedIndex, prefetchOfflineProtectedAreas } from '$lib/utils/offlineProtectedAreas';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import {
	clearProtectedAreasMemoryCache,
	getProtectedZoneCardClasses,
	getProtectedZoneStatusMessage,
	scanProtectedAreas
} from '$lib/utils/protectedAreas';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';

describe('getProtectedZoneCardClasses', () => {
	it('returns gray for clear status', () => {
		expect(getProtectedZoneCardClasses('clear')).toContain('gray');
	});

	it('returns amber for potential status', () => {
		expect(getProtectedZoneCardClasses('potential')).toContain('amber');
	});

	it('returns red for certain status', () => {
		expect(getProtectedZoneCardClasses('certain')).toContain('red');
	});
});

describe('getProtectedZoneStatusMessage', () => {
	it('returns null for clear status', () => {
		expect(getProtectedZoneStatusMessage('clear')).toBeNull();
	});

	it('returns a message for certain and potential', () => {
		expect(getProtectedZoneStatusMessage('certain')).toBeTruthy();
		expect(getProtectedZoneStatusMessage('potential')).toBeTruthy();
	});
});

describe('scanProtectedAreas', () => {
	beforeEach(async () => {
		memoryStore.clear();
		clearProtectedAreasMemoryCache();
		await clearProtectedAreasPersistentCache();
		await clearOfflineProtectedIndex();
		apiSettingsState.loaded = true;
		apiSettingsState.ignProtectedAreas = true;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns empty scan outside cadastre coverage', async () => {
		const result = await scanProtectedAreas(30, 10);
		expect(result.hits).toEqual([]);
		expect(result.veto).toBe(false);
		expect(result.zoneStatus.natura2000).toBe('clear');
	});

	it('marks natura2000 as certain when GPS point intersects', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.includes('/cadastre/parcelle')) {
					return {
						ok: true,
						json: async () => ({
							features: [
								{
									geometry: {
										type: 'Polygon',
										coordinates: [
											[
												[0, 0],
												[1, 0],
												[1, 1],
												[0, 0]
											]
										]
									}
								}
							]
						})
					};
				}
				if (url.includes('/nature/natura-habitat')) {
					return { ok: true, json: async () => ({ features: [{ type: 'Feature' }] }) };
				}
				return { ok: true, json: async () => ({ features: [] }) };
			})
		);

		const result = await scanProtectedAreas(48.85, 2.35);
		expect(result.zoneStatus.natura2000).toBe('certain');
		expect(result.veto).toBe(false);
	});

	it('marks znieff as potential when parcel intersects but point does not', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.includes('/cadastre/parcelle')) {
					return {
						ok: true,
						json: async () => ({
							features: [
								{
									geometry: {
										type: 'Polygon',
										coordinates: [
											[
												[0, 0],
												[1, 0],
												[1, 1],
												[0, 0]
											]
										]
									}
								}
							]
						})
					};
				}
				if (url.includes('/nature/znieff1') && url.includes('Polygon')) {
					return { ok: true, json: async () => ({ features: [{ type: 'Feature' }] }) };
				}
				return { ok: true, json: async () => ({ features: [] }) };
			})
		);

		const result = await scanProtectedAreas(48.85, 2.35);
		expect(result.zoneStatus.znieff).toBe('potential');
	});

	it('skips parcelle and caution layers after certain PN veto', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes('/nature/pn') && url.includes('Point')) {
				return { ok: true, json: async () => ({ features: [{ type: 'Feature' }] }) };
			}
			return { ok: true, json: async () => ({ features: [] }) };
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await scanProtectedAreas(48.85, 2.35);
		expect(result.veto).toBe(true);
		expect(result.zoneStatus.pn).toBe('certain');
		expect(result.zoneStatus.znieff).toBe('clear');

		const urls = fetchMock.mock.calls.map((c) => String(c[0]));
		expect(urls.some((u) => u.includes('/cadastre/parcelle'))).toBe(false);
		expect(urls.some((u) => u.includes('/nature/znieff'))).toBe(false);
		expect(urls.some((u) => u.includes('/nature/pnr'))).toBe(false);
	});

	it('serves cached scan when offline', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.includes('/cadastre/parcelle')) {
					return {
						ok: true,
						json: async () => ({
							features: [{ geometry: { type: 'Point', coordinates: [2.35, 48.85] } }]
						})
					};
				}
				if (url.includes('/nature/pnr')) {
					return { ok: true, json: async () => ({ features: [{ type: 'Feature' }] }) };
				}
				return { ok: true, json: async () => ({ features: [] }) };
			})
		);

		const online = await scanProtectedAreas(48.85, 2.35, { online: true });
		expect(online.zoneStatus.pnr).toBe('certain');
		clearProtectedAreasMemoryCache();

		const offline = await scanProtectedAreas(48.85, 2.35, { online: false });
		expect(offline.fromCache).toBe(true);
		expect(offline.zoneStatus.pnr).toBe('certain');
	});

	it('reads a complete downloaded trace without calling the network', async () => {
		const ring: LngLat[] = [
			[2.3, 46.4],
			[2.6, 46.4],
			[2.6, 46.6],
			[2.3, 46.6],
			[2.3, 46.4]
		];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }))
		);
		await prefetchOfflineProtectedAreas(ring);
		vi.mocked(fetch).mockClear();
		vi.mocked(fetch).mockRejectedValue(new TypeError('offline'));

		const result = await scanProtectedAreas(46.5, 2.5, { online: false });
		expect(result.zoneStatus.znieff).toBe('clear');
		expect(result.zoneStatus.pn).toBe('clear');
		expect(result.veto).toBe(false);
		expect(result.coverage).toBe('full');
		expect(fetch).not.toHaveBeenCalled();
	});

	it('marks a downloaded ZNIEFF as caution and not a veto', async () => {
		const ring: LngLat[] = [
			[2.3, 46.4],
			[2.6, 46.4],
			[2.6, 46.6],
			[2.3, 46.6],
			[2.3, 46.4]
		];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.includes('/nature/znieff1')) {
					return {
						ok: true,
						json: async () => ({
							features: [
								{
									geometry: {
										type: 'Polygon',
										coordinates: [
											[
												[2.45, 46.45],
												[2.55, 46.45],
												[2.55, 46.55],
												[2.45, 46.55],
												[2.45, 46.45]
											]
										]
									}
								}
							]
						})
					};
				}
				return { ok: true, json: async () => ({ features: [] }) };
			})
		);
		await prefetchOfflineProtectedAreas(ring);

		const result = await scanProtectedAreas(46.5, 2.5, { online: false });
		expect(result.zoneStatus.znieff).toBe('certain');
		expect(result.veto).toBe(false);
		expect(result.hits.some((hit) => hit.id === 'znieff1' && hit.level === 'caution')).toBe(true);
	});

	it('refuses an offline point outside the downloaded trace', async () => {
		const ring: LngLat[] = [
			[2.3, 46.4],
			[2.6, 46.4],
			[2.6, 46.6],
			[2.3, 46.6],
			[2.3, 46.4]
		];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => ({ features: [] }) }))
		);
		await prefetchOfflineProtectedAreas(ring);

		await expect(scanProtectedAreas(46.9, 2.9, { online: false })).rejects.toThrow(
			/offline_cache_miss/
		);
	});

	it('does not report a clear scan when the downloaded trace is incomplete', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
		await prefetchOfflineProtectedAreas([
			[2.3, 46.4],
			[2.6, 46.4],
			[2.6, 46.6],
			[2.3, 46.6],
			[2.3, 46.4]
		]);

		await expect(scanProtectedAreas(46.5, 2.5, { online: false })).rejects.toThrow(
			/offline_cache_miss/
		);
	});

	it('does not persist a scan when the live service fails', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
		await expect(scanProtectedAreas(46.5, 2.5, { online: true })).rejects.toThrow(
			/protected_areas_scan_failed/
		);
		expect(await getCachedProtectedAreaScan(cadastreCacheKey(46.5, 2.5))).toBeUndefined();
	});
});
