import type { ProtectedAreaScan } from '$lib/types/harvest-ethics';
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

const protectedAreasStore = createStore('yamadori-protected-areas-cache', 'scans');
registerGeoCacheStore(protectedAreasStore, GEO_CACHE_STORE_IDS.protected);

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
	const entry = await encryptedCacheGet<CachedProtectedAreaScanEntry>(
		protectedAreasStore,
		GEO_CACHE_STORE_IDS.protected,
		key
	);
	if (!entry) return undefined;
	if (!isProtectedAreasCacheEntryValid(entry.fetchedAt)) {
		await encryptedCacheDel(protectedAreasStore, GEO_CACHE_STORE_IDS.protected, key);
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
	await encryptedCacheSet(protectedAreasStore, GEO_CACHE_STORE_IDS.protected, key, entry);
}

export async function clearProtectedAreasPersistentCache(): Promise<void> {
	await encryptedCacheClear(protectedAreasStore);
}

export async function getProtectedAreasCacheStats(): Promise<{ count: number }> {
	const entries = await encryptedCacheEntries<CachedProtectedAreaScanEntry>(
		protectedAreasStore,
		GEO_CACHE_STORE_IDS.protected
	);
	let count = 0;
	for (const { key, value } of entries) {
		if (!isProtectedAreasCacheEntryValid(value.fetchedAt)) {
			await encryptedCacheDel(protectedAreasStore, GEO_CACHE_STORE_IDS.protected, key);
			continue;
		}
		count += 1;
	}
	return { count };
}
