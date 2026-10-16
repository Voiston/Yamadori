import { clear, del, get, keys, set, type UseStore } from 'idb-keyval';
import { isApiEnabled } from '$lib/utils/apiPolicy';
import { MemoryTileCache } from '$lib/utils/map/tileCacheMemory';
import {
	applyTileCacheStatsOnAdd,
	applyTileCacheStatsOnRemove,
	applyTileCacheStatsOnReplace,
	createEmptyTileCacheStats,
	TILE_CACHE_STATS_METADATA_KEY,
	type TileCacheStatsMetadata
} from '$lib/utils/map/tileCacheStats';

const TILE_DB_NAME = 'yamadori-tile-cache';
const TILE_STORE_NAME = 'tiles';

type ResettableStore = UseStore & {
	close: () => Promise<void>;
};

/**
 * idb-keyval's `createStore` keeps a connection that never reopens after the
 * database is closed or deleted. This store drops that connection so a failed
 * clear can `deleteDatabase` and the next read creates a fresh one.
 */
function createResettableTileStore(): ResettableStore {
	let dbp: Promise<IDBDatabase> | undefined;
	let activeDb: IDBDatabase | null = null;

	const forgetDatabase = (db: IDBDatabase) => {
		if (activeDb !== db) return;
		activeDb = null;
		dbp = undefined;
	};

	const openDatabase = (): Promise<IDBDatabase> => {
		if (dbp) return dbp;
		dbp = new Promise((resolve, reject) => {
			const request = indexedDB.open(TILE_DB_NAME);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(TILE_STORE_NAME)) {
					db.createObjectStore(TILE_STORE_NAME);
				}
			};
			request.onsuccess = () => {
				const db = request.result;
				activeDb = db;
				db.onclose = () => {
					forgetDatabase(db);
				};
				db.onversionchange = () => {
					db.close();
					forgetDatabase(db);
				};
				resolve(db);
			};
			request.onerror = () => {
				dbp = undefined;
				reject(request.error ?? new Error('Failed to open tile cache'));
			};
		});
		return dbp;
	};

	const useStore: ResettableStore = (txMode, callback) =>
		openDatabase().then((db) =>
			callback(db.transaction(TILE_STORE_NAME, txMode).objectStore(TILE_STORE_NAME))
		);

	useStore.close = async () => {
		const pending = dbp;
		const current = activeDb;
		activeDb = null;
		dbp = undefined;
		if (current) {
			current.close();
			return;
		}
		if (!pending) return;
		try {
			const db = await pending;
			db.close();
		} catch {
			// The connection was already unusable.
		}
	};

	return useStore;
}

const tileStore = createResettableTileStore();
const IGN_TILE_PATTERN = /^https:\/\/data\.geopf\.fr\/wmts/i;
/** Cacheable basemap + protected-area overlay hosts beyond IGN. */
const CACHEABLE_TILE_HOST_PATTERN =
	/^https:\/\/(?:data\.geopf\.fr\/wmts|[abc]\.tile\.opentopomap\.org|server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile|basemap\.nationalmap\.gov\/arcgis\/rest\/services\/|wmts\.geo\.admin\.ch\/|service\.pdok\.nl\/|maps(?:neu|[1-4])?\.wien\.gv\.at\/|cache\.kartverket\.no\/|sgx\.geodatenzentrum\.de\/wmts_basemapde\/|www\.ign\.es\/wmts\/|bio\.discomap\.eea\.europa\.eu\/arcgis\/rest\/services\/|edits\.nationalmap\.gov\/arcgis\/rest\/services\/PAD-US\/|maps-cartes\.ec\.gc\.ca\/arcgis\/rest\/services\/CWS_SCF\/CPCAD\/|mapserver\.doc\.govt\.nz\/arcgis\/rest\/services\/|environment\.data\.gov\.uk\/|ogc\.nature\.scot\/|datamap\.gov\.wales\/|ccff02\.minfin\.fgov\.be\/geoservices\/|api\.os\.uk\/maps\/)/i;

const MAX_ENTRIES = 60_000;
export const MAX_TILE_CACHE_BYTES = 1500 * 1024 * 1024;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_WRITE_INTERVAL = 50;
const PRUNE_CHUNK_SIZE = 100;
const PREFETCH_CONCURRENCY = 4;
const TILE_RATE_LIMIT_ATTEMPTS = 5;
const TILE_RATE_LIMIT_BASE_MS = 500;
const TILE_RATE_LIMIT_MAX_WAIT_MS = 30_000;
const MEMORY_CACHE_MAX_ENTRIES = 96;
const MEMORY_CACHE_MAX_BYTES = 12 * 1024 * 1024;

type CachedTile = {
	data: ArrayBuffer;
	cachedAt: number;
	contentType: string;
};

type TileFetchSource = 'memory' | 'idb' | 'network';

export type TileCachePerfSnapshot = {
	lastFetchMs: number;
	lastFetchSource: TileFetchSource | null;
	lastPruneMs: number;
	fetchesLastSecond: number;
};

let interceptorRegistered = false;
let originalFetch: typeof fetch | null = null;
let writesSincePrune = 0;
let pruneInFlight: Promise<void> | null = null;
let pruneIdleScheduled = false;
const inFlightNetworkFetches = new Map<string, Promise<CachedTile>>();
/** Bumped on clear so an in-flight write cannot repopulate tiles that were just deleted. */
let cacheGeneration = 0;
let databaseRecovery: Promise<void> | null = null;

const memoryCache = new MemoryTileCache(
	MEMORY_CACHE_MAX_ENTRIES,
	MEMORY_CACHE_MAX_BYTES,
	MAX_AGE_MS
);

let statsMetadata: TileCacheStatsMetadata | null = null;
let statsMetadataLoaded = false;

let perfLastFetchMs = 0;
let perfLastFetchSource: TileFetchSource | null = null;
let perfLastPruneMs = 0;
let perfFetchTimestamps: number[] = [];

function isIgnTileUrl(url: string): boolean {
	return IGN_TILE_PATTERN.test(url);
}

function isCacheableTileUrl(url: string): boolean {
	return CACHEABLE_TILE_HOST_PATTERN.test(url) || isIgnTileUrl(url);
}

/** Exported for unit tests. */
export function isTileUrlCacheable(url: string): boolean {
	return isCacheableTileUrl(url);
}

function isStatsMetadataKey(key: string): boolean {
	return key === TILE_CACHE_STATS_METADATA_KEY;
}

function requestUrl(input: RequestInfo | URL): string {
	if (typeof input === 'string') {
		return input;
	}
	if (input instanceof URL) {
		return input.href;
	}
	return input.url;
}

function contentTypeForUrl(url: string): string {
	return url.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
}

function copyArrayBuffer(data: ArrayBuffer): ArrayBuffer | null {
	try {
		return data.slice(0);
	} catch {
		return null;
	}
}

class TileRequestError extends Error {
	readonly status: number;
	readonly retryAfterMs: number | null;

	constructor(status: number, retryAfterMs: number | null) {
		super(`Tile fetch failed: ${status}`);
		this.name = 'TileRequestError';
		this.status = status;
		this.retryAfterMs = retryAfterMs;
	}
}

function parseRetryAfterMs(header: string | null): number | null {
	if (!header) return null;
	const seconds = Number(header);
	if (Number.isFinite(seconds) && seconds >= 0) {
		return Math.min(TILE_RATE_LIMIT_MAX_WAIT_MS, Math.round(seconds * 1000));
	}
	const date = Date.parse(header);
	if (Number.isNaN(date)) return null;
	return Math.min(TILE_RATE_LIMIT_MAX_WAIT_MS, Math.max(0, date - Date.now()));
}

function tileBackoffMs(attempt: number, retryAfterMs: number | null): number {
	if (retryAfterMs !== null) {
		return Math.min(TILE_RATE_LIMIT_MAX_WAIT_MS, retryAfterMs);
	}
	const exponential = TILE_RATE_LIMIT_BASE_MS * 2 ** (attempt - 1);
	const jitter = Math.random() * TILE_RATE_LIMIT_BASE_MS;
	return Math.min(TILE_RATE_LIMIT_MAX_WAIT_MS, Math.round(exponential + jitter));
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.reject(abortError(signal));
	}
	if (ms <= 0) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(abortError(signal));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		if (signal) {
			signal.addEventListener('abort', onAbort, { once: true });
		}
	});
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException
		? error.name === 'AbortError'
		: error instanceof Error && error.name === 'AbortError';
}

function abortError(signal?: AbortSignal): DOMException {
	const reason = signal?.reason;
	const message = typeof reason === 'string' && reason ? reason : 'Aborted';
	return new DOMException(message, 'AbortError');
}

function requestSignal(input: RequestInfo | URL, init?: RequestInit): AbortSignal | undefined {
	if (init?.signal) return init.signal;
	if (typeof Request !== 'undefined' && input instanceof Request) return input.signal;
	return undefined;
}

/** A copy so MapLibre can consume the body without detaching the cached buffer. */
function tileResponse(tile: CachedTile, url: string): Response | null {
	const bytes = copyArrayBuffer(tile.data);
	if (!bytes || bytes.byteLength === 0) return null;
	return new Response(bytes, {
		status: 200,
		headers: { 'Content-Type': tile.contentType || contentTypeForUrl(url) }
	});
}

function waitForSharedTile(pending: Promise<CachedTile>, signal?: AbortSignal): Promise<CachedTile> {
	if (!signal) return pending;
	if (signal.aborted) return Promise.reject(abortError(signal));

	return new Promise((resolve, reject) => {
		const onAbort = () => {
			reject(abortError(signal));
		};
		signal.addEventListener('abort', onAbort, { once: true });
		pending.then(
			(tile) => {
				signal.removeEventListener('abort', onAbort);
				if (signal.aborted) {
					reject(abortError(signal));
					return;
				}
				resolve(tile);
			},
			(error: unknown) => {
				signal.removeEventListener('abort', onAbort);
				reject(error);
			}
		);
	});
}

async function deleteTileDatabase(): Promise<void> {
	if (typeof indexedDB === 'undefined') return;
	await new Promise<void>((resolve) => {
		const request = indexedDB.deleteDatabase(TILE_DB_NAME);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}

/** Close and delete a broken tile database so the next read can recreate it. */
async function recoverTileDatabase(): Promise<void> {
	if (databaseRecovery) return databaseRecovery;
	databaseRecovery = (async () => {
		cacheGeneration += 1;
		memoryCache.clear();
		inFlightNetworkFetches.clear();
		await tileStore.close();
		await deleteTileDatabase();
		statsMetadata = createEmptyTileCacheStats();
		statsMetadataLoaded = true;
	})().finally(() => {
		databaseRecovery = null;
	});
	return databaseRecovery;
}

function scheduleIdleWork(work: () => void): void {
	if (typeof requestIdleCallback !== 'undefined') {
		requestIdleCallback(work, { timeout: 5_000 });
		return;
	}
	setTimeout(work, 0);
}

function recordFetchPerf(source: TileFetchSource, durationMs: number): void {
	if (!import.meta.env.DEV) {
		return;
	}

	perfLastFetchMs = durationMs;
	perfLastFetchSource = source;
	const now = Date.now();
	perfFetchTimestamps.push(now);
	perfFetchTimestamps = perfFetchTimestamps.filter((timestamp) => now - timestamp <= 1_000);
}

function recordPrunePerf(durationMs: number): void {
	if (!import.meta.env.DEV) {
		return;
	}
	perfLastPruneMs = durationMs;
}

export function getTileCachePerfSnapshot(): TileCachePerfSnapshot | null {
	if (!import.meta.env.DEV) {
		return null;
	}

	return {
		lastFetchMs: perfLastFetchMs,
		lastFetchSource: perfLastFetchSource,
		lastPruneMs: perfLastPruneMs,
		fetchesLastSecond: perfFetchTimestamps.length
	};
}

async function persistStatsMetadata(generation = cacheGeneration): Promise<void> {
	if (!statsMetadata || generation !== cacheGeneration) {
		return;
	}
	const snapshot = statsMetadata;
	await set(TILE_CACHE_STATS_METADATA_KEY, snapshot, tileStore);
	if (generation !== cacheGeneration && statsMetadata) {
		// A clear finished while this write was in flight. Put the current stats back.
		await set(TILE_CACHE_STATS_METADATA_KEY, statsMetadata, tileStore);
	}
}

async function rebuildStatsMetadata(): Promise<TileCacheStatsMetadata> {
	const allKeys = await keys(tileStore);
	let count = 0;
	let bytes = 0;
	let oldestAt: number | null = null;
	const now = Date.now();

	for (const key of allKeys) {
		const keyString = String(key);
		if (isStatsMetadataKey(keyString)) {
			continue;
		}

		const entry = await get<CachedTile>(keyString, tileStore);
		if (!entry) {
			await del(keyString, tileStore);
			continue;
		}
		if (now - entry.cachedAt > MAX_AGE_MS) {
			await del(keyString, tileStore);
			continue;
		}

		count += 1;
		bytes += entry.data.byteLength;
		if (oldestAt === null || entry.cachedAt < oldestAt) {
			oldestAt = entry.cachedAt;
		}
	}

	statsMetadata = {
		count,
		bytes,
		oldestAt,
		updatedAt: now
	};
	statsMetadataLoaded = true;
	await persistStatsMetadata();
	return statsMetadata;
}

async function loadStatsMetadata(): Promise<TileCacheStatsMetadata> {
	if (statsMetadata) {
		return statsMetadata;
	}

	try {
		const stored = await get<TileCacheStatsMetadata>(TILE_CACHE_STATS_METADATA_KEY, tileStore);
		if (stored && stored.updatedAt > 0) {
			statsMetadata = stored;
			statsMetadataLoaded = true;
			return stored;
		}
	} catch {
		statsMetadata = createEmptyTileCacheStats();
		statsMetadataLoaded = true;
		return statsMetadata;
	}

	return rebuildStatsMetadata();
}

async function ensureStatsMetadataLoaded(): Promise<void> {
	if (!statsMetadataLoaded) {
		await loadStatsMetadata();
	}
}

async function removeCachedTile(url: string, entry: CachedTile): Promise<void> {
	memoryCache.remove(url);
	await del(url, tileStore);
	await ensureStatsMetadataLoaded();
	statsMetadata = applyTileCacheStatsOnRemove(
		statsMetadata ?? createEmptyTileCacheStats(),
		entry.data.byteLength,
		entry.cachedAt
	);
	await persistStatsMetadata();
}

async function runChunkedPrune(): Promise<void> {
	const pruneStartedAt = performance.now();
	const now = Date.now();
	const allKeys = await keys(tileStore);
	const tileKeys = allKeys
		.map((key) => String(key))
		.filter((key) => !isStatsMetadataKey(key));

	const validEntries: { key: string; cachedAt: number; bytes: number }[] = [];
	let keyIndex = 0;

	while (keyIndex < tileKeys.length) {
		const chunkEnd = Math.min(keyIndex + PRUNE_CHUNK_SIZE, tileKeys.length);
		for (; keyIndex < chunkEnd; keyIndex += 1) {
			const key = tileKeys[keyIndex];
			const entry = await get<CachedTile>(key, tileStore);
			if (!entry) {
				await del(key, tileStore);
				continue;
			}
			if (now - entry.cachedAt > MAX_AGE_MS) {
				await removeCachedTile(key, entry);
				continue;
			}
			validEntries.push({ key, cachedAt: entry.cachedAt, bytes: entry.data.byteLength });
		}

		if (keyIndex < tileKeys.length) {
			await new Promise<void>((resolve) => scheduleIdleWork(resolve));
		}
	}

	validEntries.sort((a, b) => a.cachedAt - b.cachedAt);
	let totalBytes = validEntries.reduce((sum, entry) => sum + entry.bytes, 0);
	let removeIndex = 0;

	while (
		removeIndex < validEntries.length &&
		(validEntries.length - removeIndex > MAX_ENTRIES || totalBytes > MAX_TILE_CACHE_BYTES)
	) {
		const chunkEnd = Math.min(removeIndex + PRUNE_CHUNK_SIZE, validEntries.length);
		for (; removeIndex < chunkEnd; removeIndex += 1) {
			if (validEntries.length - removeIndex <= MAX_ENTRIES && totalBytes <= MAX_TILE_CACHE_BYTES) {
				break;
			}

			const target = validEntries[removeIndex];
			const entry = await get<CachedTile>(target.key, tileStore);
			if (entry) {
				await removeCachedTile(target.key, entry);
				totalBytes -= entry.data.byteLength;
			}
		}

		if (
			removeIndex < validEntries.length &&
			(validEntries.length - removeIndex > MAX_ENTRIES || totalBytes > MAX_TILE_CACHE_BYTES)
		) {
			await new Promise<void>((resolve) => scheduleIdleWork(resolve));
		} else {
			break;
		}
	}

	recordPrunePerf(performance.now() - pruneStartedAt);
}

function schedulePruneCache(): void {
	writesSincePrune += 1;
	if (writesSincePrune < PRUNE_WRITE_INTERVAL) {
		return;
	}
	writesSincePrune = 0;

	if (pruneIdleScheduled || pruneInFlight) {
		return;
	}

	pruneIdleScheduled = true;
	scheduleIdleWork(() => {
		pruneIdleScheduled = false;
		if (pruneInFlight) {
			return;
		}
		pruneInFlight = runChunkedPrune().finally(() => {
			pruneInFlight = null;
		});
	});
}

function getCachedTileFromMemory(url: string): CachedTile | null {
	return memoryCache.get(url);
}

async function getCachedTileFromIdb(url: string): Promise<CachedTile | null> {
	let entry: CachedTile | undefined;
	try {
		entry = await get<CachedTile>(url, tileStore);
	} catch {
		// A broken database must not block the network tile.
		return null;
	}
	if (!entry?.data) {
		return null;
	}
	if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
		try {
			await removeCachedTile(url, entry);
		} catch {
			memoryCache.remove(url);
		}
		return null;
	}
	const bytes = copyArrayBuffer(entry.data);
	if (!bytes || bytes.byteLength === 0) return null;
	const cached: CachedTile = { data: bytes, cachedAt: entry.cachedAt, contentType: entry.contentType };
	memoryCache.put(url, cached);
	return cached;
}

async function getCachedTile(url: string): Promise<CachedTile | null> {
	const fromMemory = getCachedTileFromMemory(url);
	if (fromMemory) {
		return fromMemory;
	}
	return getCachedTileFromIdb(url);
}

async function persistCachedTile(
	url: string,
	data: ArrayBuffer,
	contentType: string,
	deferStatsPersist = false
): Promise<void> {
	const generation = cacheGeneration;
	const cachedAt = Date.now();
	const storedData = copyArrayBuffer(data);
	if (!storedData || storedData.byteLength === 0) return;

	const entry: CachedTile = { data: storedData, cachedAt, contentType };

	try {
		let previous: CachedTile | undefined;
		try {
			previous = await get<CachedTile>(url, tileStore);
		} catch {
			previous = undefined;
		}
		if (generation !== cacheGeneration) return;

		await set(url, entry, tileStore);
		if (generation !== cacheGeneration) {
			try {
				await del(url, tileStore);
			} catch {
				// The clear already removed it, or the database is being recreated.
			}
			return;
		}

		const memoryCopy = copyArrayBuffer(storedData);
		if (memoryCopy) {
			memoryCache.put(url, { data: memoryCopy, cachedAt, contentType });
		}

		await ensureStatsMetadataLoaded();
		if (generation !== cacheGeneration) return;

		if (previous?.data) {
			statsMetadata = applyTileCacheStatsOnReplace(
				statsMetadata ?? createEmptyTileCacheStats(),
				previous.data.byteLength,
				storedData.byteLength
			);
		} else {
			statsMetadata = applyTileCacheStatsOnAdd(
				statsMetadata ?? createEmptyTileCacheStats(),
				storedData.byteLength,
				cachedAt
			);
		}
		if (!deferStatsPersist) {
			await persistStatsMetadata(generation);
		}
	} catch {
		memoryCache.remove(url);
		await recoverTileDatabase();
	}
}

async function loadIgnTileFromNetwork(
	url: string,
	options?: { deferStatsPersist?: boolean }
): Promise<CachedTile> {
	const fromIdb = await getCachedTileFromIdb(url);
	if (fromIdb) {
		return fromIdb;
	}

	if (!isApiEnabled('ignMap')) {
		throw new Error('IGN map API disabled');
	}

	// Shared by every waiter. The caller's AbortSignal must not cancel it:
	// MapLibre aborts tiles that scroll away, and that used to fail the download
	// for the next request of the same URL.
	const fetchImpl = originalFetch ?? fetch;
	const response = await fetchImpl(url);
	if (!response.ok) {
		throw new TileRequestError(response.status, parseRetryAfterMs(response.headers.get('retry-after')));
	}

	const data = await response.arrayBuffer();
	const contentType = response.headers.get('Content-Type') ?? contentTypeForUrl(url);
	const served = copyArrayBuffer(data);
	await persistCachedTile(url, served ?? data, contentType, options?.deferStatsPersist ?? false);
	schedulePruneCache();

	const cached = getCachedTileFromMemory(url);
	if (cached) {
		return cached;
	}

	if (served && served.byteLength > 0) {
		return {
			data: served,
			cachedAt: Date.now(),
			contentType
		};
	}

	throw new Error('Tile fetch failed: 500');
}

function acquireIgnTileLoad(
	url: string,
	options?: { deferStatsPersist?: boolean }
): Promise<CachedTile> {
	let pending = inFlightNetworkFetches.get(url);
	if (!pending) {
		pending = loadIgnTileFromNetwork(url, options);
		inFlightNetworkFetches.set(url, pending);
		void pending
			.finally(() => {
				if (inFlightNetworkFetches.get(url) === pending) {
					inFlightNetworkFetches.delete(url);
				}
			})
			.catch(() => {
				// The caller awaits `pending` and handles the failure.
			});
	}
	return pending;
}

async function resolveIgnTileFromNetwork(
	url: string,
	options?: { deferStatsPersist?: boolean; signal?: AbortSignal }
): Promise<CachedTile> {
	return waitForSharedTile(
		acquireIgnTileLoad(url, { deferStatsPersist: options?.deferStatsPersist }),
		options?.signal
	);
}

async function fetchIgnTile(url: string, signal?: AbortSignal): Promise<Response> {
	const startedAt = performance.now();
	if (signal?.aborted) {
		throw abortError(signal);
	}

	const fromMemory = getCachedTileFromMemory(url);
	if (fromMemory) {
		const response = tileResponse(fromMemory, url);
		if (response) {
			recordFetchPerf('memory', performance.now() - startedAt);
			return response;
		}
		memoryCache.remove(url);
	}

	if (!isApiEnabled('ignMap')) {
		return new Response(null, { status: 503, statusText: 'Service Unavailable' });
	}

	try {
		const tile = await waitForSharedTile(acquireIgnTileLoad(url), signal);
		const response = tileResponse(tile, url);
		if (!response) {
			throw new Error('Tile fetch failed: 500');
		}
		recordFetchPerf('network', performance.now() - startedAt);
		return response;
	} catch (error) {
		if (isAbortError(error)) throw error;
		const message = error instanceof Error ? error.message : '';
		if (message.startsWith('Tile fetch failed:')) {
			const statusCode = Number.parseInt(message.slice('Tile fetch failed:'.length).trim(), 10);
			return new Response(null, {
				status: Number.isFinite(statusCode) ? statusCode : 500,
				statusText: 'Tile fetch failed'
			});
		}
		throw error;
	}
}

export function registerTileCacheInterceptor(): void {
	if (interceptorRegistered || typeof window === 'undefined') {
		return;
	}

	const original = window.fetch.bind(window);
	originalFetch = original;

	window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = requestUrl(input);
		if (isCacheableTileUrl(url)) {
			return fetchIgnTile(url, requestSignal(input, init));
		}
		return original(input, init);
	};

	interceptorRegistered = true;
}

/** @deprecated Use registerTileCacheInterceptor */
export function registerTileCacheProtocol(): void {
	registerTileCacheInterceptor();
}

export async function getTileCacheStats(): Promise<{
	count: number;
	bytes: number;
	oldestAt: number | null;
}> {
	const metadata = await loadStatsMetadata();
	return {
		count: metadata.count,
		bytes: metadata.bytes,
		oldestAt: metadata.oldestAt
	};
}

export async function rebuildTileCacheStats(): Promise<{
	count: number;
	bytes: number;
	oldestAt: number | null;
}> {
	const metadata = await rebuildStatsMetadata();
	return {
		count: metadata.count,
		bytes: metadata.bytes,
		oldestAt: metadata.oldestAt
	};
}

export function formatTileCacheSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} o`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} Ko`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export async function clearTileCache(): Promise<void> {
	const generation = (cacheGeneration += 1);
	inFlightNetworkFetches.clear();
	memoryCache.clear();
	writesSincePrune = 0;

	try {
		await clear(tileStore);
	} catch {
		await recoverTileDatabase();
	}

	if (generation !== cacheGeneration) return;

	statsMetadata = createEmptyTileCacheStats();
	statsMetadataLoaded = true;
	try {
		await persistStatsMetadata(generation);
	} catch {
		await recoverTileDatabase();
	}
}

function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
	const latRad = (lat * Math.PI) / 180;
	const n = 2 ** zoom;
	const x = Math.floor(((lng + 180) / 360) * n);
	const y = Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
	);
	return { x, y };
}

function expandBounds(
	bounds: { west: number; south: number; east: number; north: number },
	paddingDeg = 0.02
) {
	return {
		west: bounds.west - paddingDeg,
		south: bounds.south - paddingDeg,
		east: bounds.east + paddingDeg,
		north: bounds.north + paddingDeg
	};
}

export type TileBounds = {
	west: number;
	south: number;
	east: number;
	north: number;
};

export function countTilesForBounds(bounds: TileBounds, zoomLevels: number[]): number {
	const expanded = expandBounds(bounds);
	let count = 0;

	for (const zoom of zoomLevels) {
		const min = lngLatToTile(expanded.west, expanded.north, zoom);
		const max = lngLatToTile(expanded.east, expanded.south, zoom);
		count += (max.x - min.x + 1) * (max.y - min.y + 1);
	}

	return count;
}

const OFFLINE_PACK_MIN_ZOOM = 10;
const OFFLINE_PACK_WALK_ZOOMS = [14, 15, 16];
const OFFLINE_PACK_DETAIL_MIN_ZOOM = 17;

/** Walking zooms stop here. Higher levels belong to the optional detail band. */
export const OFFLINE_PACK_FIELD_MAX_ZOOM = 16;

/** Maps plus overlays. Forecasts are not tiles and do not count toward this cap. */
export const OFFLINE_PACK_MAX_TILES = 60_000;

/** Amber warning on the pack sheet. Confirmation stays available until the hard cap. */
export const OFFLINE_PACK_TILE_WARNING = 2_000;

/** Rough raster size used only to show an order of magnitude before download. */
export const OFFLINE_PACK_BYTES_PER_TILE = 25 * 1024;

export type OfflineZoomBands = {
	view: boolean;
	walk: boolean;
	detail: boolean;
};

export function getDownloadZoomLevels(currentZoom: number, maxZoom: number): number[] {
	const zoom = Math.min(Math.round(currentZoom), maxZoom);
	return [Math.max(OFFLINE_PACK_MIN_ZOOM, zoom - 1), zoom].filter(
		(value, index, array) => array.indexOf(value) === index
	);
}

/**
 * Selected bands, capped by the layer max zoom, with every integer between the
 * lowest and highest so a pinch does not land on a missing level.
 * Detail (17+) is included only when the layer itself goes that high.
 */
export function offlinePackZoomLevels(
	currentZoom: number,
	maxZoom: number,
	bands: OfflineZoomBands
): number[] {
	const view = Math.min(Math.round(currentZoom), maxZoom);
	const chosen = new Set<number>();

	if (bands.view) {
		const below = Math.max(OFFLINE_PACK_MIN_ZOOM, view - 1);
		if (below <= maxZoom) {
			chosen.add(below);
		}
		if (view >= OFFLINE_PACK_MIN_ZOOM && view <= maxZoom) {
			chosen.add(view);
		} else if (OFFLINE_PACK_MIN_ZOOM <= maxZoom) {
			chosen.add(OFFLINE_PACK_MIN_ZOOM);
		}
	}

	if (bands.walk) {
		for (const zoom of OFFLINE_PACK_WALK_ZOOMS) {
			if (zoom <= maxZoom) {
				chosen.add(zoom);
			}
		}
	}

	if (bands.detail) {
		for (let zoom = OFFLINE_PACK_DETAIL_MIN_ZOOM; zoom <= maxZoom; zoom += 1) {
			chosen.add(zoom);
		}
	}

	if (chosen.size === 0) {
		return [];
	}

	const sorted = [...chosen].sort((left, right) => left - right);
	const levels: number[] = [];
	for (let zoom = sorted[0]; zoom <= sorted[sorted.length - 1]; zoom += 1) {
		if (zoom <= maxZoom) {
			levels.push(zoom);
		}
	}
	return levels;
}

/** View zoom, the level below, and walking zooms 14–16, with no gaps. */
export function getOfflinePackZoomLevels(currentZoom: number, maxZoom: number): number[] {
	return offlinePackZoomLevels(currentZoom, maxZoom, {
		view: true,
		walk: true,
		detail: false
	});
}

export function boundsFromMap(map: {
	getBounds: () => {
		getWest: () => number;
		getSouth: () => number;
		getEast: () => number;
		getNorth: () => number;
	};
}): TileBounds {
	const bounds = map.getBounds();
	return {
		west: bounds.getWest(),
		south: bounds.getSouth(),
		east: bounds.getEast(),
		north: bounds.getNorth()
	};
}

export type PrefetchTilesOptions = {
	signal?: AbortSignal;
	onProgress?: (done: number, total: number) => void;
	includeTile?: (z: number, x: number, y: number) => boolean;
	/** Extra tile ring around bounds. When set (or when includeTile is set), skips degree padding. */
	padTiles?: number;
};

export async function prefetchTilesForBounds(
	bounds: TileBounds,
	zoomLevels: number[],
	buildUrl: (z: number, x: number, y: number) => string,
	optionsOrProgress?: PrefetchTilesOptions | ((done: number, total: number) => void)
): Promise<{ fetched: number; failed: number }> {
	if (!isApiEnabled('ignMap')) {
		return { fetched: 0, failed: 0 };
	}

	const options =
		typeof optionsOrProgress === 'function'
			? { onProgress: optionsOrProgress }
			: (optionsOrProgress ?? {});
	const { signal, onProgress, includeTile } = options;
	const useTilePadding = options.padTiles !== undefined || includeTile !== undefined;
	const padTiles = options.padTiles ?? (includeTile ? 1 : 0);
	const expanded = useTilePadding ? bounds : expandBounds(bounds);
	const urls: string[] = [];

	for (const zoom of zoomLevels) {
		const n = 2 ** zoom;
		const min = lngLatToTile(expanded.west, expanded.north, zoom);
		const max = lngLatToTile(expanded.east, expanded.south, zoom);
		const minX = Math.max(0, Math.min(min.x, max.x) - padTiles);
		const maxX = Math.min(n - 1, Math.max(min.x, max.x) + padTiles);
		const minY = Math.max(0, Math.min(min.y, max.y) - padTiles);
		const maxY = Math.min(n - 1, Math.max(min.y, max.y) + padTiles);

		for (let x = minX; x <= maxX; x += 1) {
			for (let y = minY; y <= maxY; y += 1) {
				if (includeTile && !includeTile(zoom, x, y)) {
					continue;
				}
				urls.push(buildUrl(zoom, x, y));
			}
		}
	}

	let fetched = 0;
	let failed = 0;
	let completed = 0;
	let backoffUntil = 0;

	async function waitForTileBackoff(): Promise<void> {
		while (Date.now() < backoffUntil) {
			if (signal?.aborted) {
				throw abortError(signal);
			}
			await sleep(backoffUntil - Date.now(), signal);
		}
	}

	async function prefetchUrl(url: string): Promise<void> {
		try {
			if (signal?.aborted) {
				throw abortError(signal);
			}

			const cached = await getCachedTile(url);
			if (cached) {
				return;
			}

			for (let attempt = 1; attempt <= TILE_RATE_LIMIT_ATTEMPTS; attempt += 1) {
				await waitForTileBackoff();
				try {
					await resolveIgnTileFromNetwork(url, { deferStatsPersist: true, signal });
					fetched += 1;
					return;
				} catch (error) {
					if (isAbortError(error)) {
						throw error;
					}
					const rateLimited = error instanceof TileRequestError && error.status === 429;
					if (!rateLimited || attempt === TILE_RATE_LIMIT_ATTEMPTS) {
						throw error;
					}
					backoffUntil = Math.max(
						backoffUntil,
						Date.now() + tileBackoffMs(attempt, error.retryAfterMs)
					);
				}
			}
		} catch (error) {
			if (isAbortError(error)) {
				throw error;
			}
			failed += 1;
		} finally {
			completed += 1;
			onProgress?.(completed, urls.length);
		}
	}

	let nextIndex = 0;
	const workerCount = Math.min(PREFETCH_CONCURRENCY, urls.length);

	async function worker(): Promise<void> {
		while (nextIndex < urls.length) {
			if (signal?.aborted) {
				return;
			}
			const url = urls[nextIndex];
			nextIndex += 1;
			await prefetchUrl(url);
		}
	}

	try {
		await Promise.all(Array.from({ length: workerCount }, () => worker()));
	} catch (error) {
		if (!(error instanceof DOMException && error.name === 'AbortError')) {
			throw error;
		}
	}

	await persistStatsMetadata();

	if (writesSincePrune > 0) {
		writesSincePrune = PRUNE_WRITE_INTERVAL;
		schedulePruneCache();
	}

	return { fetched, failed };
}

export function buildIgnWmtsUrl(
	layer: string,
	format: string,
	z: number,
	x: number,
	y: number
): string {
	let url =
		`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
		`&LAYER=${layer}&STYLE=normal&FORMAT=${format}` +
		`&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`;

	const apiKey = import.meta.env.VITE_IGN_API_KEY;
	if (typeof apiKey === 'string' && apiKey.trim()) {
		url += `&apikey=${encodeURIComponent(apiKey.trim())}`;
	}

	return url;
}

/** Expand a MapLibre-style `{z}/{x}/{y}` tile URL template. */
export function expandTileUrlTemplate(template: string, z: number, x: number, y: number): string {
	return template.replaceAll('{z}', String(z)).replaceAll('{x}', String(x)).replaceAll('{y}', String(y));
}
