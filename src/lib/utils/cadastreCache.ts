import type { CadastreInfo } from '$lib/types/cadastre';
import { createStore, del, get, keys, set } from 'idb-keyval';

const cadastreStore = createStore('yamadori-cadastre-cache', 'parcels');

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
	const entry = await get<CachedCadastreEntry>(key, cadastreStore);
	if (!entry) return undefined;
	if (!isCadastreCacheEntryValid(entry.fetchedAt)) {
		await del(key, cadastreStore);
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
	await set(key, entry, cadastreStore);
}

export async function clearCadastrePersistentCache(): Promise<void> {
	const allKeys = await keys(cadastreStore);
	await Promise.all(allKeys.map((key) => del(key, cadastreStore)));
}

export async function getCadastreCacheStats(): Promise<{ count: number }> {
	const allKeys = await keys(cadastreStore);
	let count = 0;

	for (const key of allKeys) {
		const entry = await get<CachedCadastreEntry>(key, cadastreStore);
		if (!entry || !isCadastreCacheEntryValid(entry.fetchedAt)) {
			await del(key, cadastreStore);
			continue;
		}
		count += 1;
	}

	return { count };
}
