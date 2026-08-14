import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { classifyCapadHits } from '$lib/geo/providers/capad/classify';
import { queryCapadAt } from '$lib/geo/providers/capad/client';
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
		void saveCachedCadastre(`au:${key}`, value);
	}
}

/**
 * Australia land-tenure via CAPAD terrestrial protected areas.
 * Outside CAPAD → crown_unverified / unknown (never assume private OK).
 */
export async function lookupCadastreAu(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!pointInCountryBboxes(latitude, longitude, 'AU')) {
		return null;
	}

	const key = cadastreCacheKey(latitude, longitude);
	const cachedMemory = readMemory(key);
	if (cachedMemory !== undefined) return cachedMemory;

	const cachedPersistent = await getCachedCadastre(`au:${key}`);
	if (cachedPersistent !== undefined) {
		writeMemory(key, cachedPersistent, false);
		return cachedPersistent;
	}

	try {
		const hits = await queryCapadAt(latitude, longitude, options);
		const classified = classifyCapadHits(hits);
		const label =
			classified.unitName ||
			classified.managerName ||
			(classified.zoneType === 'crown_unverified'
				? 'Outside CAPAD protected areas'
				: 'Protected area');

		const info: CadastreInfo = {
			commune: label,
			section: 'AU',
			parcelNumber: '—',
			codeInsee: classified.paId ?? '',
			zoneType: classified.zoneType,
			fetchedAt: new Date().toISOString(),
			unitName: classified.unitName || undefined,
			managerName: classified.managerName || undefined,
			designation: classified.designation || undefined,
			stateCode: classified.stateCode || undefined,
			collectStatus: classified.collectStatus
		};

		writeMemory(key, info);
		return info;
	} catch {
		const info: CadastreInfo = {
			commune: 'Land tenure unavailable',
			section: 'AU',
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
