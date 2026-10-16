import { gridKeyForCoordinates } from '$lib/utils/weatherCache';
import { createStore } from 'idb-keyval';
import {
	encryptedCacheClear,
	encryptedCacheDel,
	encryptedCacheEntries,
	encryptedCacheGet,
	encryptedCacheSet,
	GEO_CACHE_STORE_IDS,
	registerGeoCacheStore
} from '$lib/utils/encryptedCacheStore';

const geocodeStore = createStore('yamadori-geocode-cache', 'labels');
registerGeoCacheStore(geocodeStore, GEO_CACHE_STORE_IDS.geocode);

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
	const entry = await encryptedCacheGet<CachedGeocodeEntry>(
		geocodeStore,
		GEO_CACHE_STORE_IDS.geocode,
		key
	);
	if (!entry) return undefined;
	if (!isGeocodeCacheEntryValid(entry.fetchedAt)) {
		await encryptedCacheDel(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key);
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
	const entries = await encryptedCacheEntries<{ fetchedAt: string }>(
		geocodeStore,
		GEO_CACHE_STORE_IDS.geocode
	);
	const ranked: { key: string; fetchedMs: number }[] = [];

	for (const { key, value } of entries) {
		if (kind === 'raw' ? !isRawCacheKey(key) : isRawCacheKey(key)) continue;
		if (!isGeocodeCacheEntryValid(value.fetchedAt)) {
			await encryptedCacheDel(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key);
			continue;
		}
		ranked.push({ key, fetchedMs: Date.parse(value.fetchedAt) });
	}

	if (ranked.length <= maxEntries) return;

	ranked.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = ranked.length - maxEntries;
	for (let index = 0; index < toRemove; index += 1) {
		await encryptedCacheDel(geocodeStore, GEO_CACHE_STORE_IDS.geocode, ranked[index]!.key);
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
	await encryptedCacheSet(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key, entry);
	await pruneGeocodeCache();
}

export async function getGeocodeCacheStats(): Promise<{ count: number }> {
	const entries = await encryptedCacheEntries<{ fetchedAt: string }>(
		geocodeStore,
		GEO_CACHE_STORE_IDS.geocode
	);
	let count = 0;

	for (const { key, value } of entries) {
		if (!isGeocodeCacheEntryValid(value.fetchedAt)) {
			await encryptedCacheDel(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key);
			continue;
		}
		count += 1;
	}

	return { count };
}

export async function clearGeocodeCache(): Promise<void> {
	await encryptedCacheClear(geocodeStore);
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
	const entry = await encryptedCacheGet<CachedGeocodeRawEntry>(
		geocodeStore,
		GEO_CACHE_STORE_IDS.geocode,
		key
	);
	if (!entry) return undefined;
	if (!isGeocodeCacheEntryValid(entry.fetchedAt)) {
		await encryptedCacheDel(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key);
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
	await encryptedCacheSet(geocodeStore, GEO_CACHE_STORE_IDS.geocode, key, entry);
	await pruneGeocodeCache();
}
