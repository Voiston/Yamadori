import * as m from '$lib/paraglide/messages.js';
import type { AgriData } from '$lib/types/agri';
import type { YrsPlantInputs } from '$lib/types/yrs';
import { enrichAgriData } from '$lib/utils/agriCache';
import { fetchAgriDataBase } from '$lib/utils/agri';
import {
	findCachedForecast,
	findStaleCachedForecast,
	saveCachedForecast,
	type CachedWeatherLookup
} from '$lib/utils/weatherCache';

export type AgriDataSource = 'live' | 'cache' | null;

export type AgriLoadResult = {
	data: AgriData | null;
	source: AgriDataSource;
	cachedAt: string | null;
	cacheDistanceM: number | null;
	cacheStale: boolean;
	error: string;
};

export function getOfflineCacheError(): string {
	return m.agri_offline_cache();
}

export const OFFLINE_CACHE_ERROR = getOfflineCacheError();

export async function resolveAgriData(
	latitude: number,
	longitude: number,
	plantInputs: YrsPlantInputs,
	online: boolean
): Promise<AgriLoadResult> {
	if (online) {
		try {
			const { baseData, forecastBody } = await fetchAgriDataBase(latitude, longitude, plantInputs);
			await saveCachedForecast(latitude, longitude, baseData, forecastBody);
			const fresh = enrichAgriData(baseData, plantInputs, forecastBody);
			return {
				data: fresh,
				source: 'live',
				cachedAt: null,
				cacheDistanceM: null,
				cacheStale: false,
				error: ''
			};
		} catch (error) {
			const cached = await loadCachedAgriData(latitude, longitude, plantInputs, false);
			if (cached) return cached;
			const stale = await loadCachedAgriData(latitude, longitude, plantInputs, true);
			if (stale) return stale;
			return {
				data: null,
				source: null,
				cachedAt: null,
				cacheDistanceM: null,
				cacheStale: false,
				error:
					error instanceof Error ? error.message : m.agri_error_fetch()
			};
		}
	}

	const cached = await loadCachedAgriData(latitude, longitude, plantInputs, false);
	if (cached) return cached;

	const stale = await loadCachedAgriData(latitude, longitude, plantInputs, true);
	if (stale) return stale;

	return {
		data: null,
		source: null,
		cachedAt: null,
		cacheDistanceM: null,
		cacheStale: false,
		error: getOfflineCacheError()
	};
}

function toAgriLoadResult(
	cached: CachedWeatherLookup,
	plantInputs: YrsPlantInputs,
	stale: boolean
): AgriLoadResult {
	return {
		data: enrichAgriData(cached.entry.data, plantInputs, cached.entry.forecastBody),
		source: 'cache',
		cachedAt: cached.entry.fetchedAt,
		cacheDistanceM: cached.distanceM,
		cacheStale: stale,
		error: ''
	};
}

async function loadCachedAgriData(
	latitude: number,
	longitude: number,
	plantInputs: YrsPlantInputs,
	stale: boolean
): Promise<AgriLoadResult | null> {
	const cached = stale
		? await findStaleCachedForecast(latitude, longitude)
		: await findCachedForecast(latitude, longitude);
	if (!cached) return null;
	return toAgriLoadResult(cached, plantInputs, stale);
}
