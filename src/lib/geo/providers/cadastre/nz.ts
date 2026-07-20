import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { classifyDocPclHits } from '$lib/geo/providers/doc-pcl/classify';
import { queryDocPclAt } from '$lib/geo/providers/doc-pcl/client';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import { getCachedCadastre, saveCachedCadastre } from '$lib/utils/cadastreCache';
import { throwIfAborted } from '$lib/utils/abortSignal';

const MEMORY_CACHE_TTL_MS = 30 * 60_000;

type MemoryCacheEntry = {
	expiresAt: number;
	value: CadastreInfo | null;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

function readMemory(key: string): CadastreInfo | null | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return entry.value;
}

function writeMemory(key: string, value: CadastreInfo | null, persist = true): void {
	memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
	if (persist) {
		void saveCachedCadastre(`nz:${key}`, value);
	}
}

/**
 * New Zealand land-tenure via DOC Public Conservation Land.
 * Outside DOC PCL → crown_unverified / unknown (never assume private OK).
 */
export async function lookupCadastreNz(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!pointInCountryBboxes(latitude, longitude, 'NZ')) {
		return null;
	}

	const key = cadastreCacheKey(latitude, longitude);
	const cachedMemory = readMemory(key);
	if (cachedMemory !== undefined) return cachedMemory;

	const cachedPersistent = await getCachedCadastre(`nz:${key}`);
	if (cachedPersistent !== undefined) {
		writeMemory(key, cachedPersistent, false);
		return cachedPersistent;
	}

	try {
		const hits = await queryDocPclAt(latitude, longitude, options);
		const classified = classifyDocPclHits(hits);
		const label =
			classified.unitName ||
			classified.managerName ||
			(classified.zoneType === 'crown_unverified'
				? 'Outside DOC public conservation land'
				: 'Public conservation land');

		const info: CadastreInfo = {
			commune: label,
			section: 'NZ',
			parcelNumber: '—',
			codeInsee: '',
			zoneType: classified.zoneType,
			fetchedAt: new Date().toISOString(),
			unitName: classified.unitName || undefined,
			managerName: classified.managerName || undefined,
			designation: classified.designation || undefined,
			collectStatus: classified.collectStatus
		};

		writeMemory(key, info);
		return info;
	} catch {
		const info: CadastreInfo = {
			commune: 'Land tenure unavailable',
			section: 'NZ',
			parcelNumber: '—',
			codeInsee: '',
			zoneType: 'crown_unverified',
			fetchedAt: new Date().toISOString(),
			collectStatus: 'unknown'
		};
		writeMemory(key, info, false);
		return info;
	}
}
