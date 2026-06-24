import type { AgriData } from '$lib/types/agri';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStore = new Map<string, unknown>();

const fetchAgriDataBaseMock = vi.fn();

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

vi.mock('$lib/utils/agri', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/agri')>();
	return {
		...actual,
		fetchAgriDataBase: (...args: unknown[]) => fetchAgriDataBaseMock(...args)
	};
});

import * as m from '$lib/paraglide/messages.js';
import { resolveAgriData } from './agriDataLoader';
import { saveCachedForecast } from './weatherCache';

function buildAgriData(latitude: number, longitude: number): AgriData {
	return {
		fetchedAt: '2026-06-22T10:00:00.000Z',
		latitude,
		longitude,
		airTemperatureC: 18,
		relativeHumidityPct: 65,
		windSpeedKmh: 12,
		et0TodayMm: 0.8,
		shortwaveRadiationCurrentWm2: 300,
		shortwaveRadiationMaxTodayWm2: 350,
		rainPast3dMm: 15,
		rainPast5dMm: 25,
		rainPast7dMm: 30,
		soilTemperature6cmC: 11,
		soilTemperature18cmC: 11,
		soilConsecutiveStableDays: 5,
		soilMean5dC: 11,
		soilMean6cm7dC: 11,
		soilMean18cm7dC: 11,
		soilDailyHistory7d: [],
		soilBrutalNightDrop: false,
		soilTrend7dRising: true,
		soilHeatBufferC: 0,
		soilStabilityScore: 95,
		soilMoisture7cmPct: null,
		frostRiskNext7d: false,
		frostMinNext7dC: 2,
		et0Past7dMeanMm: 0.8,
		et0Trend7dMeanMm: 0.8,
		et0Past7dSumMm: 5.6,
		et0Forecast7dSumMm: 5.6,
		waterBalance7dMm: 24.4,
		windStressIndex: 25,
		radiationStressIndex: 30,
		heatStressDaysPast7d: 0,
		heatStressDaysForecast7d: 0,
		frostEventsPast7d: 0,
		soilBufferScore: 70,
		wsi: 31.4,
		futureStressRiskMm: 5.6,
		weeklyViability: null,
		gdd: null,
		yrs: {
			score: 72,
			decision: 'ACCEPTABLE',
			layers: {
				climate: 20,
				soil: 18,
				phenology: 15,
				hydric: 14,
				stressPenalty: 0
			},
			summary: 'Conditions acceptables.'
		}
	};
}

describe('resolveAgriData', () => {
	beforeEach(() => {
		memoryStore.clear();
		fetchAgriDataBaseMock.mockReset();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-22T12:00:00'));
	});

	it('uses live data and persists to cache when online', async () => {
		const fresh = buildAgriData(47.2, 2.2);
		fetchAgriDataBaseMock.mockResolvedValue({
			baseData: fresh,
			forecastBody: undefined
		});

		const result = await resolveAgriData(47.2, 2.2, { species: 'Erable' }, true);

		expect(result.source).toBe('live');
		expect(result.data?.airTemperatureC).toBe(18);
		expect(fetchAgriDataBaseMock).toHaveBeenCalledOnce();
	});

	it('falls back to cache when offline', async () => {
		const cached = buildAgriData(47.2, 2.2);
		await saveCachedForecast(47.2, 2.2, cached);

		const result = await resolveAgriData(47.2, 2.2, { species: 'Erable' }, false);

		expect(fetchAgriDataBaseMock).not.toHaveBeenCalled();
		expect(result.source).toBe('cache');
		expect(result.cacheStale).toBe(false);
		expect(result.data?.airTemperatureC).toBe(18);
		expect(result.cachedAt).toBe('2026-06-22T10:00:00.000Z');
	});

	it('falls back to stale cache when offline and fresh cache is missing', async () => {
		const cached = buildAgriData(47.2, 2.2);
		cached.fetchedAt = '2026-06-20T08:00:00.000Z';
		await saveCachedForecast(47.2, 2.2, cached);

		const result = await resolveAgriData(47.2, 2.2, { species: 'Erable' }, false);

		expect(result.source).toBe('cache');
		expect(result.cacheStale).toBe(true);
		expect(result.data?.airTemperatureC).toBe(18);
	});

	it('returns an explicit error when offline without cache', async () => {
		const result = await resolveAgriData(47.2, 2.2, {}, false);

		expect(result.data).toBeNull();
		expect(result.source).toBeNull();
		expect(result.error).toBe(m.agri_offline_cache());
	});

	it('falls back to cache when online fetch fails', async () => {
		const cached = buildAgriData(47.2, 2.2);
		await saveCachedForecast(47.2, 2.2, cached);
		fetchAgriDataBaseMock.mockRejectedValue(new Error('Network down'));

		const result = await resolveAgriData(47.2, 2.2, {}, true);

		expect(result.source).toBe('cache');
		expect(result.cacheStale).toBe(false);
		expect(result.data?.airTemperatureC).toBe(18);
	});
});
