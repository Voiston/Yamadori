import type { CadastreInfo } from '$lib/types/cadastre';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import { getCachedCadastre, saveCachedCadastre } from '$lib/utils/cadastreCache';
import { createInFlightMap } from '$lib/utils/inFlight';

const MEMORY_CACHE_TTL_MS = 30 * 60_000;

type MemoryCacheEntry = {
	expiresAt: number;
	value: CadastreInfo | null;
};

const memoryCache = new Map<string, MemoryCacheEntry>();
const inFlight = createInFlightMap<CadastreInfo | null>();

function readMemory(key: string): CadastreInfo | null | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return entry.value;
}

function writeMemory(key: string, value: CadastreInfo | null, persist: boolean): void {
	memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
	if (persist) {
		void saveCachedCadastre(key, value);
	}
}

/**
 * Memory (30 min) + IDB (30 d) + in-flight coalesce for country-prefixed cadastre keys.
 * Use for EU providers that previously had no persistent cache.
 */
export async function withCadastreCountryCache(
	countryPrefix: string,
	latitude: number,
	longitude: number,
	fetcher: () => Promise<CadastreInfo | null>,
	options?: { persistFailures?: boolean }
): Promise<CadastreInfo | null> {
	const persistFailures = options?.persistFailures ?? false;
	const gridKey = cadastreCacheKey(latitude, longitude);
	const cacheKey = `${countryPrefix}:${gridKey}`;

	const cachedMemory = readMemory(cacheKey);
	if (cachedMemory !== undefined) return cachedMemory;

	return inFlight.run(cacheKey, async () => {
		const cachedAgain = readMemory(cacheKey);
		if (cachedAgain !== undefined) return cachedAgain;

		const cachedPersistent = await getCachedCadastre(cacheKey);
		if (cachedPersistent !== undefined) {
			writeMemory(cacheKey, cachedPersistent, false);
			return cachedPersistent;
		}

		try {
			const value = await fetcher();
			writeMemory(cacheKey, value, true);
			return value;
		} catch (error) {
			if (persistFailures) {
				writeMemory(cacheKey, null, true);
			}
			throw error;
		}
	});
}

/** Session / tests. */
export function clearCadastreCountryMemoryCache(): void {
	memoryCache.clear();
	inFlight.clear();
}
