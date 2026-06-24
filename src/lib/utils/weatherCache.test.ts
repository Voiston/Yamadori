import type { AgriData } from '$lib/types/agri';
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

import {
	clearWeatherCache,
	findCachedForecast,
	findStaleCachedForecast,
	getWeatherCacheStats,
	gridKeyForCoordinates,
	isCacheEntryFresh,
	isCacheEntryRetained,
	MAX_CACHE_DISTANCE_M,
	MAX_CACHE_ENTRIES,
	MAX_FRESH_AGE_MS,
	pickClosestFreshEntry,
	saveCachedForecast
} from './weatherCache';
import { enrichCachedAgriData } from './agriCache';
import { computeYamadoriReadinessScore } from './yrs';

function buildAgriData(
	latitude: number,
	longitude: number,
	fetchedAt: string,
	overrides: Partial<AgriData> = {}
): AgriData {
	return {
		fetchedAt,
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
		yrs: null,
		...overrides
	};
}

describe('weatherCache helpers', () => {
	it('builds a stable grid key from coordinates', () => {
		expect(gridKeyForCoordinates(47.456, 2.349)).toBe('47.46_2.35');
	});

	it('accepts entries fresher than 3 h', () => {
		const now = new Date('2026-06-22T12:00:00');
		expect(isCacheEntryFresh('2026-06-22T09:30:00.000Z', now)).toBe(true);
	});

	it('rejects entries older than 3 h', () => {
		const now = new Date('2026-06-22T12:00:00');
		const fetchedAt = new Date(now.getTime() - MAX_FRESH_AGE_MS - 1).toISOString();
		expect(isCacheEntryFresh(fetchedAt, now)).toBe(false);
	});

	it('keeps stale entries within the retention window', () => {
		const now = new Date('2026-06-22T12:00:00');
		const fetchedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
		expect(isCacheEntryFresh(fetchedAt, now)).toBe(false);
		expect(isCacheEntryRetained(fetchedAt, now)).toBe(true);
	});

	it('prefers an exact grid match over a closer non-exact entry', () => {
		const now = new Date('2026-06-22T12:00:00');
		const entries = [
			{
				latitude: 47.46,
				longitude: 2.35,
				fetchedAt: '2026-06-22T11:00:00.000Z',
				data: buildAgriData(47.46, 2.35, '2026-06-22T11:00:00.000Z')
			},
			{
				latitude: 47.451,
				longitude: 2.341,
				fetchedAt: '2026-06-22T11:30:00.000Z',
				data: buildAgriData(47.451, 2.341, '2026-06-22T11:30:00.000Z')
			}
		];

		const match = pickClosestFreshEntry(47.456, 2.349, entries, now);
		expect(match?.exactMatch).toBe(true);
		expect(match?.entry.latitude).toBe(47.46);
	});

	it('returns the nearest entry within 30 km', () => {
		const now = new Date('2026-06-22T12:00:00');
		const entries = [
			{
				latitude: 47.0,
				longitude: 2.0,
				fetchedAt: '2026-06-22T11:00:00.000Z',
				data: buildAgriData(47.0, 2.0, '2026-06-22T11:00:00.000Z')
			},
			{
				latitude: 47.2,
				longitude: 2.2,
				fetchedAt: '2026-06-22T11:30:00.000Z',
				data: buildAgriData(47.2, 2.2, '2026-06-22T11:30:00.000Z')
			}
		];

		const match = pickClosestFreshEntry(47.21, 2.21, entries, now);
		expect(match?.entry.latitude).toBe(47.2);
		expect(match?.distanceM).toBeLessThan(MAX_CACHE_DISTANCE_M);
	});

	it('ignores entries beyond 30 km', () => {
		const now = new Date('2026-06-22T12:00:00');
		const entries = [
			{
				latitude: 48.5,
				longitude: 3.0,
				fetchedAt: '2026-06-22T11:00:00.000Z',
				data: buildAgriData(48.5, 3.0, '2026-06-22T11:00:00.000Z')
			}
		];

		expect(pickClosestFreshEntry(47.2, 2.2, entries, now)).toBeNull();
	});
});

describe('weatherCache persistence', () => {
	beforeEach(() => {
		memoryStore.clear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-22T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('saves and reads an exact grid entry', async () => {
		const data = buildAgriData(47.456, 2.349, '2026-06-22T11:00:00.000Z');
		await saveCachedForecast(47.456, 2.349, data);

		const cached = await findCachedForecast(47.456, 2.349);
		expect(cached?.exactMatch).toBe(true);
		expect(cached?.entry.data.airTemperatureC).toBe(18);
	});

	it('finds a nearby cached forecast within 30 km', async () => {
		const data = buildAgriData(47.2, 2.2, '2026-06-22T11:00:00.000Z');
		await saveCachedForecast(47.2, 2.2, data);

		const cached = await findCachedForecast(47.21, 2.21);
		expect(cached).not.toBeNull();
		expect(cached?.distanceM).toBeLessThan(MAX_CACHE_DISTANCE_M);
	});

	it('returns null for fresh lookup when only stale entries exist', async () => {
		const data = buildAgriData(47.2, 2.2, '2026-06-21T08:00:00.000Z');
		await saveCachedForecast(47.2, 2.2, data);

		expect(await findCachedForecast(47.2, 2.2)).toBeNull();
		expect(await getWeatherCacheStats()).toEqual({ count: 1 });
	});

	it('returns stale entries for offline fallback', async () => {
		const data = buildAgriData(47.2, 2.2, '2026-06-21T08:00:00.000Z');
		await saveCachedForecast(47.2, 2.2, data);

		const stale = await findStaleCachedForecast(47.2, 2.2);
		expect(stale?.exactMatch).toBe(true);
		expect(stale?.entry.data.airTemperatureC).toBe(18);
	});

	it('removes entries beyond the retention window', async () => {
		const data = buildAgriData(47.2, 2.2, '2026-06-01T08:00:00.000Z');
		await saveCachedForecast(47.2, 2.2, data);

		expect(await findCachedForecast(47.2, 2.2)).toBeNull();
		expect(await findStaleCachedForecast(47.2, 2.2)).toBeNull();
		expect(await getWeatherCacheStats()).toEqual({ count: 0 });
	});

	it('prunes oldest entries beyond the max entry count', async () => {
		for (let index = 0; index < MAX_CACHE_ENTRIES + 3; index += 1) {
			const lat = 47 + index * 0.01;
			const fetchedAt = new Date(Date.parse('2026-06-22T11:00:00.000Z') + index * 60_000).toISOString();
			await saveCachedForecast(lat, 2.2, buildAgriData(lat, 2.2, fetchedAt));
		}

		const stats = await getWeatherCacheStats();
		expect(stats.count).toBeLessThanOrEqual(MAX_CACHE_ENTRIES);
	});

	it('clears all cached forecasts', async () => {
		await saveCachedForecast(47.2, 2.2, buildAgriData(47.2, 2.2, '2026-06-22T11:00:00.000Z'));
		await clearWeatherCache();
		expect(await getWeatherCacheStats()).toEqual({ count: 0 });
	});
});

describe('enrichCachedAgriData', () => {
	it('recomputes YRS from cached metrics and current plant inputs', () => {
		const cached = buildAgriData(47.2, 2.2, '2026-06-22T11:00:00.000Z', {
			yrs: computeYamadoriReadinessScore(buildAgriData(47.2, 2.2, '2026-06-22T11:00:00.000Z'), {
				species: 'Erable'
			})
		});

		const enriched = enrichCachedAgriData(cached, {
			species: 'Pin',
			cernageStatus: 'partial'
		});

		expect(enriched.yrs).not.toBeNull();
		expect(enriched.yrs?.score).toBeTypeOf('number');
	});
});
