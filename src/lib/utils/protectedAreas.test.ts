import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

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
import { clearProtectedAreasPersistentCache } from '$lib/utils/protectedAreasCache';
import {
	clearProtectedAreasMemoryCache,
	getProtectedZoneCardClasses,
	getProtectedZoneStatusMessage,
	scanProtectedAreas
} from '$lib/utils/protectedAreas';

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
});
