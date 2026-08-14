import { gridKeyForCoordinates } from '$lib/utils/weatherCache';
import { createStore, del, get, keys, set } from 'idb-keyval';

const geocodeStore = createStore('yamadori-geocode-cache', 'labels');

export const MAX_GEOCODE_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** Label keys (`lang:grid`) — separate from raw to avoid thrash. */
export const MAX_GEOCODE_LABEL_CACHE_ENTRIES = 100;
/** Raw Nominatim payloads (`raw:…`) — shared zoom-14 etc. */
export const MAX_GEOCODE_RAW_CACHE_ENTRIES = 100;
/** Soft combined total (label + raw budgets). */
export const MAX_GEOCODE_CACHE_ENTRIES =
	MAX_GEOCODE_LABEL_CACHE_ENTRIES + MAX_GEOCODE_RAW_CACHE_ENTRIES;

export interface CachedGeocodeEntry {
	fetchedAt: string;
	label: string;
}

export function geocodeCacheKey(
	latitude: number,
	longitude: number,
	lang = 'und'
): string {
	return `${lang}:${gridKeyForCoordinates(latitude, longitude)}`;
}

export function isGeocodeCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_GEOCODE_CACHE_AGE_MS;
}

export async function getCachedGeocodeLabel(
	latitude: number,
	longitude: number,
	lang = 'und'
): Promise<string | undefined> {
	const key = geocodeCacheKey(latitude, longitude, lang);
	const entry = await get<CachedGeocodeEntry>(key, geocodeStore);
	if (!entry) return undefined;
	if (!isGeocodeCacheEntryValid(entry.fetchedAt)) {
		await del(key, geocodeStore);
		return undefined;
	}
	return entry.label;
}

function isRawCacheKey(key: string): boolean {
	return key.startsWith('raw:');
}

async function pruneGeocodeCacheBucket(
	kind: 'raw' | 'label',
	maxEntries: number
): Promise<void> {
	const allKeys = await keys(geocodeStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const keyStr = String(key);
		if (kind === 'raw' ? !isRawCacheKey(keyStr) : isRawCacheKey(keyStr)) continue;

		const entry = await get<{ fetchedAt: string }>(key, geocodeStore);
		if (!entry || !isGeocodeCacheEntryValid(entry.fetchedAt)) {
			await del(key, geocodeStore);
			continue;
		}
		entries.push({ key: keyStr, fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= maxEntries) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - maxEntries;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, geocodeStore);
	}
}

async function pruneGeocodeCache(): Promise<void> {
	await pruneGeocodeCacheBucket('label', MAX_GEOCODE_LABEL_CACHE_ENTRIES);
	await pruneGeocodeCacheBucket('raw', MAX_GEOCODE_RAW_CACHE_ENTRIES);
}

export async function saveCachedGeocodeLabel(
	latitude: number,
	longitude: number,
	label: string,
	lang = 'und'
): Promise<void> {
	const key = geocodeCacheKey(latitude, longitude, lang);
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
		const entry = await get<{ fetchedAt: string }>(key, geocodeStore);
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

export type NominatimRawPayload = {
	display_name?: string;
	address?: Record<string, string | undefined>;
};

export interface CachedGeocodeRawEntry {
	fetchedAt: string;
	payload: NominatimRawPayload;
}

export function geocodeRawCacheKey(
	latitude: number,
	longitude: number,
	zoom: number,
	lang = 'und'
): string {
	return `raw:${lang}:${zoom}:${gridKeyForCoordinates(latitude, longitude)}`;
}

export async function getCachedGeocodeRaw(
	latitude: number,
	longitude: number,
	zoom: number,
	lang = 'und'
): Promise<NominatimRawPayload | undefined> {
	const key = geocodeRawCacheKey(latitude, longitude, zoom, lang);
	const entry = await get<CachedGeocodeRawEntry>(key, geocodeStore);
	if (!entry) return undefined;
	if (!isGeocodeCacheEntryValid(entry.fetchedAt)) {
		await del(key, geocodeStore);
		return undefined;
	}
	return entry.payload;
}

export async function saveCachedGeocodeRaw(
	latitude: number,
	longitude: number,
	zoom: number,
	payload: NominatimRawPayload,
	lang = 'und'
): Promise<void> {
	const key = geocodeRawCacheKey(latitude, longitude, zoom, lang);
	const entry: CachedGeocodeRawEntry = {
		fetchedAt: new Date().toISOString(),
		payload
	};
	await set(key, entry, geocodeStore);
	await pruneGeocodeCache();
}
