import { cadastreCacheKey } from '$lib/utils/cadastre';
import { createStore, del, get, keys, set } from 'idb-keyval';

const geocodeStore = createStore('yamadori-geocode-cache', 'labels');

export const MAX_GEOCODE_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_GEOCODE_CACHE_ENTRIES = 50;

export interface CachedGeocodeEntry {
	fetchedAt: string;
	label: string;
}

export function geocodeCacheKey(latitude: number, longitude: number): string {
	return cadastreCacheKey(latitude, longitude);
}

export function isGeocodeCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_GEOCODE_CACHE_AGE_MS;
}

export async function getCachedGeocodeLabel(
	latitude: number,
	longitude: number
): Promise<string | undefined> {
	const key = geocodeCacheKey(latitude, longitude);
	const entry = await get<CachedGeocodeEntry>(key, geocodeStore);
	if (!entry) return undefined;
	if (!isGeocodeCacheEntryValid(entry.fetchedAt)) {
		await del(key, geocodeStore);
		return undefined;
	}
	return entry.label;
}

async function pruneGeocodeCache(): Promise<void> {
	const allKeys = await keys(geocodeStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedGeocodeEntry>(key, geocodeStore);
		if (!entry || !isGeocodeCacheEntryValid(entry.fetchedAt)) {
			await del(key, geocodeStore);
			continue;
		}
		entries.push({ key: String(key), fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= MAX_GEOCODE_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - MAX_GEOCODE_CACHE_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, geocodeStore);
	}
}

export async function saveCachedGeocodeLabel(
	latitude: number,
	longitude: number,
	label: string
): Promise<void> {
	const key = geocodeCacheKey(latitude, longitude);
	const entry: CachedGeocodeEntry = {
		fetchedAt: new Date().toISOString(),
		label
	};
	await set(key, entry, geocodeStore);
	await pruneGeocodeCache();
}

export async function getGeocodeCacheStats(): Promise<{ count: number }> {
	const allKeys = await keys(geocodeStore);
	let count = 0;

	for (const key of allKeys) {
		const entry = await get<CachedGeocodeEntry>(key, geocodeStore);
		if (!entry || !isGeocodeCacheEntryValid(entry.fetchedAt)) {
			await del(key, geocodeStore);
			continue;
		}
		count += 1;
	}

	return { count };
}

export async function clearGeocodeCache(): Promise<void> {
	const allKeys = await keys(geocodeStore);
	await Promise.all(allKeys.map((key) => del(key, geocodeStore)));
}
