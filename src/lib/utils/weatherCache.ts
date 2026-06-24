import type { AgriData } from '$lib/types/agri';
import type { OpenMeteoForecastResponse } from '$lib/utils/agri';
import { toStorable } from '$lib/utils/idb-store';
import { haversineDistanceM } from '$lib/utils/haversine';
import { createStore, del, get, keys, set } from 'idb-keyval';

const weatherStore = createStore('yamadori-weather-cache', 'forecasts');

export const MAX_CACHE_ENTRIES = 20;
/** Données considérées fraîches — pas d'appel API si le cache est plus récent. */
export const MAX_FRESH_AGE_MS = 3 * 60 * 60 * 1000;
/** Durée de rétention en IndexedDB pour le repli hors-ligne (même périmé). */
export const MAX_RETENTION_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_CACHE_DISTANCE_M = 30_000;

export interface CachedWeatherForecast {
	latitude: number;
	longitude: number;
	fetchedAt: string;
	data: AgriData;
	forecastBody?: OpenMeteoForecastResponse;
}

export interface CachedWeatherLookup {
	entry: CachedWeatherForecast;
	distanceM: number;
	exactMatch: boolean;
}

export function gridKeyForCoordinates(latitude: number, longitude: number): string {
	return `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
}

export function isCacheEntryFresh(fetchedAt: string, now = new Date()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now.getTime() - fetchedMs <= MAX_FRESH_AGE_MS;
}

/** @deprecated Use isCacheEntryFresh */
export const isCacheEntryValid = isCacheEntryFresh;

export function isCacheEntryRetained(fetchedAt: string, now = new Date()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now.getTime() - fetchedMs <= MAX_RETENTION_AGE_MS;
}

export function cacheAgeHours(fetchedAt: string, now = new Date()): number {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return 0;
	return Math.max(0, Math.floor((now.getTime() - fetchedMs) / (60 * 60 * 1000)));
}

export function cacheAgeDays(fetchedAt: string, now = new Date()): number {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return 0;
	return Math.max(0, Math.floor((now.getTime() - fetchedMs) / (24 * 60 * 60 * 1000)));
}

function pickClosestEntry(
	latitude: number,
	longitude: number,
	entries: CachedWeatherForecast[],
	isEligible: (fetchedAt: string, now: Date) => boolean,
	now = new Date()
): CachedWeatherLookup | null {
	let best: CachedWeatherLookup | null = null;

	for (const entry of entries) {
		if (!isEligible(entry.fetchedAt, now)) continue;

		const distanceM = haversineDistanceM(latitude, longitude, entry.latitude, entry.longitude);
		if (distanceM > MAX_CACHE_DISTANCE_M) continue;

		const exactMatch =
			gridKeyForCoordinates(latitude, longitude) ===
			gridKeyForCoordinates(entry.latitude, entry.longitude);

		if (!best || exactMatch || (!best.exactMatch && distanceM < best.distanceM)) {
			best = { entry, distanceM, exactMatch };
			if (exactMatch) break;
		}
	}

	return best;
}

export function pickClosestFreshEntry(
	latitude: number,
	longitude: number,
	entries: CachedWeatherForecast[],
	now = new Date()
): CachedWeatherLookup | null {
	return pickClosestEntry(latitude, longitude, entries, isCacheEntryFresh, now);
}

/** @deprecated Use pickClosestFreshEntry */
export const pickClosestValidEntry = pickClosestFreshEntry;

export function pickClosestStaleEntry(
	latitude: number,
	longitude: number,
	entries: CachedWeatherForecast[],
	now = new Date()
): CachedWeatherLookup | null {
	return pickClosestEntry(
		latitude,
		longitude,
		entries,
		(fetchedAt, reference) => isCacheEntryRetained(fetchedAt, reference) && !isCacheEntryFresh(fetchedAt, reference),
		now
	);
}

async function loadAllRetainedEntries(now = new Date()): Promise<CachedWeatherForecast[]> {
	const allKeys = await keys(weatherStore);
	const entries: CachedWeatherForecast[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedWeatherForecast>(key, weatherStore);
		if (!entry) {
			await del(key, weatherStore);
			continue;
		}
		if (!isCacheEntryRetained(entry.fetchedAt, now)) {
			await del(key, weatherStore);
			continue;
		}
		entries.push(entry);
	}

	return entries;
}

async function pruneCache(): Promise<void> {
	const allKeys = await keys(weatherStore);
	const entries: { key: string; fetchedMs: number }[] = [];

	for (const key of allKeys) {
		const entry = await get<CachedWeatherForecast>(key, weatherStore);
		if (!entry || !isCacheEntryRetained(entry.fetchedAt)) {
			await del(key, weatherStore);
			continue;
		}
		entries.push({ key: String(key), fetchedMs: Date.parse(entry.fetchedAt) });
	}

	if (entries.length <= MAX_CACHE_ENTRIES) return;

	entries.sort((a, b) => a.fetchedMs - b.fetchedMs);
	const toRemove = entries.length - MAX_CACHE_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, weatherStore);
	}
}

export async function saveCachedForecast(
	latitude: number,
	longitude: number,
	data: AgriData,
	forecastBody?: OpenMeteoForecastResponse
): Promise<void> {
	const key = gridKeyForCoordinates(latitude, longitude);
	const entry: CachedWeatherForecast = {
		latitude,
		longitude,
		fetchedAt: data.fetchedAt,
		data: toStorable(data),
		...(forecastBody ? { forecastBody } : {})
	};
	await set(key, entry, weatherStore);
	await pruneCache();
}

export async function findCachedForecast(
	latitude: number,
	longitude: number,
	now = new Date()
): Promise<CachedWeatherLookup | null> {
	const exactKey = gridKeyForCoordinates(latitude, longitude);
	const exactEntry = await get<CachedWeatherForecast>(exactKey, weatherStore);
	if (exactEntry && isCacheEntryFresh(exactEntry.fetchedAt, now)) {
		return {
			entry: exactEntry,
			distanceM: haversineDistanceM(
				latitude,
				longitude,
				exactEntry.latitude,
				exactEntry.longitude
			),
			exactMatch: true
		};
	}

	const entries = await loadAllRetainedEntries(now);
	return pickClosestFreshEntry(latitude, longitude, entries, now);
}

export async function findStaleCachedForecast(
	latitude: number,
	longitude: number,
	now = new Date()
): Promise<CachedWeatherLookup | null> {
	const exactKey = gridKeyForCoordinates(latitude, longitude);
	const exactEntry = await get<CachedWeatherForecast>(exactKey, weatherStore);
	if (
		exactEntry &&
		isCacheEntryRetained(exactEntry.fetchedAt, now) &&
		!isCacheEntryFresh(exactEntry.fetchedAt, now)
	) {
		return {
			entry: exactEntry,
			distanceM: haversineDistanceM(
				latitude,
				longitude,
				exactEntry.latitude,
				exactEntry.longitude
			),
			exactMatch: true
		};
	}

	const entries = await loadAllRetainedEntries(now);
	return pickClosestStaleEntry(latitude, longitude, entries, now);
}

export async function getWeatherCacheStats(): Promise<{ count: number }> {
	const entries = await loadAllRetainedEntries();
	return { count: entries.length };
}

export async function clearWeatherCache(): Promise<void> {
	const allKeys = await keys(weatherStore);
	for (const key of allKeys) {
		await del(key, weatherStore);
	}
}
