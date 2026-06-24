import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

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
	cadastreCacheKey,
	clearCadastreCache,
	getCadastreBannerMessage,
	getCadastreSummary,
	isInCadastreCoverage,
	lookupCadastre
} from './cadastre';
import type { CadastreInfo } from '$lib/types/cadastre';

const parisLat = 48.8566;
const parisLon = 2.3522;

function parcelResponse(section = 'AB', numero = '0142', nomCom = 'Paris') {
	return {
		features: [
			{
				properties: {
					section,
					numero,
					code_insee: '75101',
					nom_com: nomCom
				}
			}
		]
	};
}

function emptyCollection() {
	return { features: [] };
}

describe('isInCadastreCoverage', () => {
	it('accepts metropolitan France', () => {
		expect(isInCadastreCoverage(parisLat, parisLon)).toBe(true);
	});

	it('rejects coordinates outside France', () => {
		expect(isInCadastreCoverage(40, 2)).toBe(false);
		expect(isInCadastreCoverage(52, 2)).toBe(false);
	});
});

describe('lookupCadastre', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearCadastreCache();
		vi.stubGlobal('fetch', vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('returns null when parcel is missing', async () => {
		vi.mocked(fetch).mockResolvedValue({
			ok: true,
			json: async () => emptyCollection()
		} as Response);

		await expect(lookupCadastre(parisLat, parisLon)).resolves.toBeNull();
	});

	it('classifies private land when no public forest intersects', async () => {
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				return { ok: true, json: async () => parcelResponse() } as Response;
			}
			return { ok: true, json: async () => emptyCollection() } as Response;
		});

		const result = await lookupCadastre(parisLat, parisLon);
		expect(result).toMatchObject({
			section: 'AB',
			parcelNumber: '0142',
			commune: 'Paris',
			zoneType: 'private'
		});
	});

	it('classifies state forest from ONF regime attribute', async () => {
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				return { ok: true, json: async () => parcelResponse() } as Response;
			}
			if (url.includes('/wfs-geoportail/search')) {
				return {
					ok: true,
					json: async () => ({
						features: [{ properties: { regime: 'Domanial' } }]
					})
				} as Response;
			}
			return { ok: true, json: async () => emptyCollection() } as Response;
		});

		const result = await lookupCadastre(parisLat, parisLon);
		expect(result?.zoneType).toBe('state_forest');
	});

	it('uses cache for repeated lookups', async () => {
		vi.mocked(fetch).mockImplementation(async (input) => {
			const url = String(input);
			if (url.includes('/cadastre/parcelle')) {
				return { ok: true, json: async () => parcelResponse() } as Response;
			}
			return { ok: true, json: async () => emptyCollection() } as Response;
		});

		await lookupCadastre(parisLat, parisLon);
		await lookupCadastre(parisLat, parisLon);

		const parcelCalls = vi
			.mocked(fetch)
			.mock.calls.filter(([url]) => String(url).includes('/cadastre/parcelle'));
		expect(parcelCalls).toHaveLength(1);
	});
});

describe('cadastre messages', () => {
	const info: CadastreInfo = {
		commune: 'Saint-Martin',
		section: 'AB',
		parcelNumber: '0142',
		codeInsee: '12345',
		zoneType: 'private',
		fetchedAt: '2026-01-01T00:00:00.000Z'
	};

	it('builds summary and banner text', () => {
		expect(getCadastreSummary(info)).toMatch(/Terrain privé/i);
		expect(getCadastreBannerMessage(info).title).toMatch(/Terrain privé/i);
		expect(getCadastreBannerMessage(info).detail).toMatch(/mairie/i);
	});

	it('uses stable cache keys', () => {
		expect(cadastreCacheKey(48.85664, 2.35221)).toBe(cadastreCacheKey(48.85661, 2.35224));
	});
});
