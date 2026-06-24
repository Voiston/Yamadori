import type { ClimateHistory } from '$lib/types/climate';
import { gridKeyForCoordinates } from '$lib/utils/weatherCache';
import { createStore, del, get, keys, set } from 'idb-keyval';

const climateStore = createStore('yamadori-climate-cache', 'archives');

/** L'archive ERA5 évolue lentement — cache d'une semaine. */
export const MAX_CLIMATE_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CLIMATE_CACHE_ENTRIES = 30;

export interface CachedClimateEntry {
	latitude: number;
	longitude: number;
	fetchedAt: string;
	history: ClimateHistory;
}

export function climateCacheKey(latitude: number, longitude: number): string {
	return gridKeyForCoordinates(latitude, longitude);
}

export function isClimateCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_CLIMATE_CACHE_AGE_MS;
}

export async function getCachedClimateHistory(
	latitude: number,
	longitude: number
): Promise<ClimateHistory | undefined> {
	const key = climateCacheKey(latitude, longitude);
	const entry = await get<CachedClimateEntry>(key, climateStore);
	if (!entry) return undefined;
	if (!isClimateCacheEntryValid(entry.fetchedAt)) {
		await del(key, climateStore);
		return undefined;
	}
	return entry.history;
}

async function pruneClimateCache(): Promise<void> {
	const allKeys = await keys(climateStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedClimateEntry>(key, climateStore);
		if (!entry || !isClimateCacheEntryValid(entry.fetchedAt)) {
			await del(key, climateStore);
			continue;
		}
		entries.push({ key: String(key), fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= MAX_CLIMATE_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - MAX_CLIMATE_CACHE_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, climateStore);
	}
}

export async function saveCachedClimateHistory(
	latitude: number,
	longitude: number,
	history: ClimateHistory
): Promise<void> {
	const key = climateCacheKey(latitude, longitude);
	const entry: CachedClimateEntry = {
		latitude,
		longitude,
		fetchedAt: history.fetchedAt,
		history
	};
	await set(key, entry, climateStore);
	await pruneClimateCache();
}

export async function getClimateCacheStats(): Promise<{ count: number }> {
	const allKeys = await keys(climateStore);
	let count = 0;

	for (const key of allKeys) {
		const entry = await get<CachedClimateEntry>(key, climateStore);
		if (!entry || !isClimateCacheEntryValid(entry.fetchedAt)) {
			await del(key, climateStore);
			continue;
		}
		count += 1;
	}

	return { count };
}

export async function clearClimateCache(): Promise<void> {
	const allKeys = await keys(climateStore);
	await Promise.all(allKeys.map((key) => del(key, climateStore)));
}
