import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { classifyPadusHits } from '$lib/geo/providers/padus/classify';
import { queryPadusFeeAt } from '$lib/geo/providers/padus/client';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import {
	getCachedCadastre,
	saveCachedCadastre
} from '$lib/utils/cadastreCache';
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
		void saveCachedCadastre(`us:${key}`, value);
	}
}

/**
 * US land-tenure lookup via PAD-US Fee Managers.
 * No private parcel geometry — empty section/parcel; commune = unit or locality label.
 */
export async function lookupCadastreUs(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!pointInCountryBboxes(latitude, longitude, 'US')) {
		return null;
	}

	const key = cadastreCacheKey(latitude, longitude);
	const cachedMemory = readMemory(key);
	if (cachedMemory !== undefined) return cachedMemory;

	const cachedPersistent = await getCachedCadastre(`us:${key}`);
	if (cachedPersistent !== undefined) {
		writeMemory(key, cachedPersistent);
		return cachedPersistent;
	}

	try {
		const hits = await queryPadusFeeAt(latitude, longitude, options);
		const classified = classifyPadusHits(hits);
		const label =
			classified.unitName ||
			classified.managerName ||
			(classified.zoneType === 'private' ? 'Private land (no public unit)' : 'Public land');

		const info: CadastreInfo = {
			commune: label,
			section: classified.stateCode || classified.stateName || 'US',
			parcelNumber: '—',
			codeInsee: '',
			zoneType: classified.zoneType,
			fetchedAt: new Date().toISOString(),
			unitName: classified.unitName || undefined,
			managerName: classified.managerName || undefined,
			stateCode: classified.stateCode || undefined,
			designation: classified.designation || undefined,
			collectStatus: classified.collectStatus
		};

		writeMemory(key, info);
		return info;
	} catch {
		const info: CadastreInfo = {
			commune: 'Land tenure unavailable',
			section: 'US',
			parcelNumber: '—',
			codeInsee: '',
			zoneType: 'private',
			fetchedAt: new Date().toISOString(),
			collectStatus: 'unknown'
		};
		// Memory-only — do not poison the 30-day persistent cache on API failure.
		writeMemory(key, info, false);
		return info;
	}
}
