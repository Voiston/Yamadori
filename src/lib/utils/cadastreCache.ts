import type { CadastreInfo } from '$lib/types/cadastre';
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

const cadastreStore = createStore('yamadori-cadastre-cache', 'parcels');
registerGeoCacheStore(cadastreStore, GEO_CACHE_STORE_IDS.cadastre);

/** Parcelle cadastrale : stable dans le temps — cache long. */
export const MAX_CADASTRE_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface CachedCadastreEntry {
	fetchedAt: string;
	value: CadastreInfo | null;
}

export function isCadastreCacheEntryValid(fetchedAt: string, now = Date.now()): boolean {
	const fetchedMs = Date.parse(fetchedAt);
	if (Number.isNaN(fetchedMs)) return false;
	return now - fetchedMs <= MAX_CADASTRE_CACHE_AGE_MS;
}

export async function getCachedCadastre(
	key: string
): Promise<CadastreInfo | null | undefined> {
	const entry = await encryptedCacheGet<CachedCadastreEntry>(
		cadastreStore,
		GEO_CACHE_STORE_IDS.cadastre,
		key
	);
	if (!entry) return undefined;
	if (!isCadastreCacheEntryValid(entry.fetchedAt)) {
		await encryptedCacheDel(cadastreStore, GEO_CACHE_STORE_IDS.cadastre, key);
		return undefined;
	}
	return entry.value;
}

export async function saveCachedCadastre(
	key: string,
	value: CadastreInfo | null
): Promise<void> {
	const entry: CachedCadastreEntry = {
		fetchedAt: new Date().toISOString(),
		value
	};
	await encryptedCacheSet(cadastreStore, GEO_CACHE_STORE_IDS.cadastre, key, entry);
}

export async function clearCadastrePersistentCache(): Promise<void> {
	await encryptedCacheClear(cadastreStore);
}

export async function getCadastreCacheStats(): Promise<{ count: number }> {
	const entries = await encryptedCacheEntries<CachedCadastreEntry>(
		cadastreStore,
		GEO_CACHE_STORE_IDS.cadastre
	);
	let count = 0;

	for (const { key, value } of entries) {
		if (!isCadastreCacheEntryValid(value.fetchedAt)) {
			await encryptedCacheDel(cadastreStore, GEO_CACHE_STORE_IDS.cadastre, key);
			continue;
		}
		count += 1;
	}

	return { count };
}
