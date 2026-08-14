import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiSettingsState } from '$lib/stores/apiSettings.svelte';

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

vi.mock('$lib/geo/resolveCountry', () => ({
	resolveCountry: vi.fn(() => 'DE')
}));

const scanProtectedAreasEea = vi.fn(async () => {
	throw new Error('live_scan_should_not_run');
});

vi.mock('$lib/geo/providers/protected/eea', () => ({
	emptyZoneStatus: vi.fn(() => ({})),
	scanProtectedAreasEea: (...args: unknown[]) =>
		(scanProtectedAreasEea as (...a: unknown[]) => unknown)(...args)
}));

describe('scanProtectedAreasForCoords online cache', { timeout: 60_000 }, () => {
	beforeEach(async () => {
		memoryStore.clear();
		scanProtectedAreasEea.mockClear();
		apiSettingsState.loaded = true;
		apiSettingsState.ignProtectedAreas = true;

		const { clearProtectedAreasDispatchMemoryCache } = await import(
			'$lib/geo/providers/protected/dispatch'
		);
		clearProtectedAreasDispatchMemoryCache();
	});

	it('uses valid IDB entry while online instead of live EEA scan', async () => {
		const cachedScan = {
			scannedAt: '2026-07-01T00:00:00.000Z',
			hits: [],
			veto: false,
			zoneStatus: {},
			fromCache: false,
			coverage: 'partial' as const
		};

		memoryStore.set('eea:51.0000,10.0000', {
			fetchedAt: new Date().toISOString(),
			value: cachedScan
		});

		const { scanProtectedAreasForCoords } = await import(
			'$lib/geo/providers/protected/dispatch'
		);

		const result = await scanProtectedAreasForCoords(51.0, 10.0, { online: true });

		expect(result.fromCache).toBe(true);
		expect(scanProtectedAreasEea).not.toHaveBeenCalled();
	});
});
