import type { ProtectedAreaScan } from '$lib/types/harvest-ethics';
import { resolveCountry } from '$lib/geo/resolveCountry';
import { emptyZoneStatus, scanProtectedAreasEea } from '$lib/geo/providers/protected/eea';
import { scanProtectedAreasCh } from '$lib/geo/providers/protected/ch';
import { scanProtectedAreasGb } from '$lib/geo/providers/protected/gb';
import { scanProtectedAreasUs } from '$lib/geo/providers/protected/us';
import { scanProtectedAreasCa } from '$lib/geo/providers/protected/ca';
import { scanProtectedAreasNz } from '$lib/geo/providers/protected/nz';
import { scanProtectedAreas } from '$lib/utils/protectedAreas';
import { cadastreCacheKey } from '$lib/utils/cadastre';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import {
	getCachedProtectedAreaScan,
	saveCachedProtectedAreaScan
} from '$lib/utils/protectedAreasCache';
import { createInFlightMap } from '$lib/utils/inFlight';

const MEMORY_CACHE_TTL_MS = 30 * 60_000;
const inFlight = createInFlightMap<ProtectedAreaScan>();

type MemoryCacheEntry = {
	expiresAt: number;
	value: ProtectedAreaScan;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

function readMemoryCache(key: string): ProtectedAreaScan | undefined {
	const entry = memoryCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memoryCache.delete(key);
		return undefined;
	}
	return entry.value;
}

function writeMemoryCache(key: string, value: ProtectedAreaScan): void {
	memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
}

function emptyScan(coverage: ProtectedAreaScan['coverage'] = 'unsupported'): ProtectedAreaScan {
	return {
		scannedAt: new Date().toISOString(),
		hits: [],
		veto: false,
		zoneStatus: emptyZoneStatus(),
		fromCache: false,
		coverage
	};
}

async function scanWithCache(
	cacheKey: string,
	online: boolean,
	fetcher: () => Promise<ProtectedAreaScan>
): Promise<ProtectedAreaScan> {
	const apiEnabled = isApiEnabled('ignProtectedAreas');
	const canFetchLive = online && apiEnabled;

	const cachedMemory = readMemoryCache(cacheKey);
	if (cachedMemory) return cachedMemory;

	const cachedPersistent = await getCachedProtectedAreaScan(cacheKey);
	if (cachedPersistent) {
		writeMemoryCache(cacheKey, cachedPersistent);
		return cachedPersistent;
	}

	if (!canFetchLive) {
		if (!apiEnabled) {
			throw new Error(getApiDisabledError('ignProtectedAreas'));
		}
		throw new Error('protected_areas_offline_cache_miss');
	}

	return inFlight.run(cacheKey, async () => {
		const cachedMemoryAgain = readMemoryCache(cacheKey);
		if (cachedMemoryAgain) return cachedMemoryAgain;

		const cachedPersistentAgain = await getCachedProtectedAreaScan(cacheKey);
		if (cachedPersistentAgain) {
			writeMemoryCache(cacheKey, cachedPersistentAgain);
			return cachedPersistentAgain;
		}

		try {
			const result = await fetcher();
			writeMemoryCache(cacheKey, result);
			await saveCachedProtectedAreaScan(cacheKey, result);
			return result;
		} catch {
			const stale = await getCachedProtectedAreaScan(cacheKey);
			if (stale) {
				writeMemoryCache(cacheKey, stale);
				return stale;
			}
			throw new Error('protected_areas_scan_failed');
		}
	});
}

/**
 * Country-aware protected-area scan.
 * FR → Apicarto; ES/IT/DE/AT/BE/NL/SE/NO → EEA; GB → Natural England;
 * CH → BAFU (partial); US → PAD-US; CA → CPCAD; NZ → DOC PCL.
 */
export async function scanProtectedAreasForCoords(
	latitude: number,
	longitude: number,
	options: { online?: boolean; signal?: AbortSignal } = {}
): Promise<ProtectedAreaScan> {
	const country = resolveCountry(latitude, longitude);
	if (!country) return emptyScan('unsupported');

	if (country === 'FR') {
		return scanProtectedAreas(latitude, longitude, { online: options.online });
	}

	const online = options.online ?? true;

	if (country === 'GB') {
		return scanWithCache(`gb:${cadastreCacheKey(latitude, longitude)}`, online, () =>
			scanProtectedAreasGb(latitude, longitude, { signal: options.signal })
		);
	}

	if (country === 'CH') {
		return scanWithCache(`ch:${cadastreCacheKey(latitude, longitude)}`, online, () =>
			scanProtectedAreasCh(latitude, longitude, { signal: options.signal })
		);
	}

	if (country === 'US') {
		return scanWithCache(`us:${cadastreCacheKey(latitude, longitude)}`, online, () =>
			scanProtectedAreasUs(latitude, longitude, { signal: options.signal })
		);
	}

	if (country === 'CA') {
		return scanWithCache(`ca:${cadastreCacheKey(latitude, longitude)}`, online, () =>
			scanProtectedAreasCa(latitude, longitude, { signal: options.signal })
		);
	}

	if (country === 'NZ') {
		return scanWithCache(`nz:${cadastreCacheKey(latitude, longitude)}`, online, () =>
			scanProtectedAreasNz(latitude, longitude, { signal: options.signal })
		);
	}

	return scanWithCache(`eea:${cadastreCacheKey(latitude, longitude)}`, online, () =>
		scanProtectedAreasEea(latitude, longitude, { signal: options.signal })
	);
}

/** Session / tests. */
export function clearProtectedAreasDispatchMemoryCache(): void {
	memoryCache.clear();
	inFlight.clear();
}
