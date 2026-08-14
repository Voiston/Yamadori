import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { classifyCpcadHits } from '$lib/geo/providers/cpcad/classify';
import { queryCpcadAt } from '$lib/geo/providers/cpcad/client';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import { getCachedCadastre, saveCachedCadastre } from '$lib/utils/cadastreCache';
import { throwIfAborted } from '$lib/utils/abortSignal';
import { getActiveLocale } from '$lib/utils/i18n/locale';

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
		void saveCachedCadastre(`ca:${key}`, value);
	}
}

/**
 * Canada land-tenure via CPCAD protected areas.
 * No national Crown-land cadastre — outside CPCAD → crown_unverified / unknown.
 */
export async function lookupCadastreCa(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!pointInCountryBboxes(latitude, longitude, 'CA')) {
		return null;
	}

	const key = cadastreCacheKey(latitude, longitude);
	const cachedMemory = readMemory(key);
	if (cachedMemory !== undefined) return cachedMemory;

	const cachedPersistent = await getCachedCadastre(`ca:${key}`);
	if (cachedPersistent !== undefined) {
		writeMemory(key, cachedPersistent, false);
		return cachedPersistent;
	}

	try {
		const hits = await queryCpcadAt(latitude, longitude, options);
		const classified = classifyCpcadHits(hits);
		const preferFr = getActiveLocale() === 'fr';
		const label =
			(preferFr ? classified.unitNameFr : classified.unitName) ||
			classified.managerName ||
			(classified.zoneType === 'crown_unverified'
				? 'Crown / private (unverified)'
				: 'Protected area');

		const info: CadastreInfo = {
			commune: label,
			section: classified.provinceCode || 'CA',
			parcelNumber: '—',
			codeInsee: '',
			zoneType: classified.zoneType,
			fetchedAt: new Date().toISOString(),
			unitName: preferFr
				? classified.unitNameFr || classified.unitName || undefined
				: classified.unitName || classified.unitNameFr || undefined,
			managerName: classified.managerName || undefined,
			stateCode: classified.provinceCode || undefined,
			designation: classified.designation || undefined,
			collectStatus: classified.collectStatus
		};

		writeMemory(key, info);
		return info;
	} catch {
		const info: CadastreInfo = {
			commune: 'Land tenure unavailable',
			section: 'CA',
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
