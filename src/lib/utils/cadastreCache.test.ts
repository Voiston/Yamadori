import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CadastreInfo } from '$lib/types/cadastre';

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

import { cadastreCacheKey, clearCadastreCache, clearCadastreMemoryCache, lookupCadastre } from './cadastre';

const parisLat = 48.8566;
const parisLon = 2.3522;

function parcelResponse() {
	return {
		features: [
			{
				properties: {
					section: 'AB',
					numero: '0142',
					code_insee: '75101',
					nom_com: 'Paris'
				}
			}
		]
	};
}

function emptyCollection() {
	return { features: [] };
}

describe('lookupCadastre persistent cache', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearCadastreCache();
		vi.stubGlobal('fetch', vi.fn());
	});

	it('reuses IndexedDB cache after memory cache is cleared', async () => {
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				return { ok: true, json: async () => parcelResponse() } as Response;
			}
			return { ok: true, json: async () => emptyCollection() } as Response;
		});

		const first = await lookupCadastre(parisLat, parisLon);
		expect(first?.section).toBe('AB');

		clearCadastreMemoryCache();
		vi.mocked(fetch).mockClear();

		const second = await lookupCadastre(parisLat, parisLon);
		expect(second?.section).toBe('AB');
		expect(vi.mocked(fetch)).not.toHaveBeenCalled();
	});
});
