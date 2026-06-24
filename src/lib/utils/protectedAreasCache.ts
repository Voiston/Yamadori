import type { ProtectedAreaScan } from '$lib/types/harvest-ethics';
import { createStore, del, get, keys, set } from 'idb-keyval';

const protectedAreasStore = createStore('yamadori-protected-areas-cache', 'scans');

/** Zonages protégés : données relativement stables — cache long. */
export const MAX_PROTECTED_AREAS_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface CachedProtectedAreaScanEntry {
	fetchedAt: string;
	value: ProtectedAreaScan;
}

export function isProtectedAreasCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_PROTECTED_AREAS_CACHE_AGE_MS;
}

export async function getCachedProtectedAreaScan(
	key: string
): Promise<ProtectedAreaScan | undefined> {
	const entry = await get<CachedProtectedAreaScanEntry>(key, protectedAreasStore);
	if (!entry) return undefined;
	if (!isProtectedAreasCacheEntryValid(entry.fetchedAt)) {
		await del(key, protectedAreasStore);
		return undefined;
	}
	return { ...entry.value, fromCache: true };
}

export async function saveCachedProtectedAreaScan(
	key: string,
	value: ProtectedAreaScan
): Promise<void> {
	const entry: CachedProtectedAreaScanEntry = {
		fetchedAt: new Date().toISOString(),
		value: { ...value, fromCache: false }
	};
	await set(key, entry, protectedAreasStore);
}

export async function clearProtectedAreasPersistentCache(): Promise<void> {
	const allKeys = await keys(protectedAreasStore);
	await Promise.all(allKeys.map((key) => del(key, protectedAreasStore)));
}
