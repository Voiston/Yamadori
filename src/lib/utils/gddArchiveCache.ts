import { gridKeyForCoordinates } from '$lib/utils/weatherCache';
import { createStore, del, get, keys, set } from 'idb-keyval';

const gddArchiveStore = createStore('yamadori-gdd-archive-cache', 'archives');

/** ERA5 archive for GDD — same retention as climate cache. */
export const MAX_GDD_ARCHIVE_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_GDD_ARCHIVE_CACHE_ENTRIES = 30;

export type GddArchiveDailyMean = { date: string; meanTempC: number | null };

export interface CachedGddArchiveEntry {
	latitude: number;
	longitude: number;
	startDate: string;
	endDate: string;
	fetchedAt: string;
	dailyMeans: GddArchiveDailyMean[];
}

export function gddArchiveCacheKey(
	latitude: number,
	longitude: number,
	startDate: string,
	endDate: string
): string {
	return `${gridKeyForCoordinates(latitude, longitude)}|${startDate}|${endDate}`;
}

export function isGddArchiveCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_GDD_ARCHIVE_CACHE_AGE_MS;
}

export async function getCachedGddArchiveDailyMeans(
	latitude: number,
	longitude: number,
	startDate: string,
	endDate: string
): Promise<GddArchiveDailyMean[] | undefined> {
	const key = gddArchiveCacheKey(latitude, longitude, startDate, endDate);
	const entry = await get<CachedGddArchiveEntry>(key, gddArchiveStore);
	if (!entry) return undefined;
	if (!isGddArchiveCacheEntryValid(entry.fetchedAt)) {
		await del(key, gddArchiveStore);
		return undefined;
	}
	return entry.dailyMeans;
}

async function pruneGddArchiveCache(): Promise<void> {
	const allKeys = await keys(gddArchiveStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedGddArchiveEntry>(key, gddArchiveStore);
		if (!entry || !isGddArchiveCacheEntryValid(entry.fetchedAt)) {
			await del(key, gddArchiveStore);
			continue;
		}
		entries.push({ key: String(key), fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= MAX_GDD_ARCHIVE_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - MAX_GDD_ARCHIVE_CACHE_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, gddArchiveStore);
	}
}

export async function saveCachedGddArchiveDailyMeans(
	latitude: number,
	longitude: number,
	startDate: string,
	endDate: string,
	dailyMeans: GddArchiveDailyMean[]
): Promise<void> {
	const key = gddArchiveCacheKey(latitude, longitude, startDate, endDate);
	const entry: CachedGddArchiveEntry = {
		latitude,
		longitude,
		startDate,
		endDate,
		fetchedAt: new Date().toISOString(),
		dailyMeans
	};
	await set(key, entry, gddArchiveStore);
	await pruneGddArchiveCache();
}
