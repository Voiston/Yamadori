import { createStore, del, get, keys, set } from 'idb-keyval';
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

const tileStore = createStore('yamadori-tile-cache', 'tiles');
const IGN_TILE_PATTERN = /^https:\/\/data\.geopf\.fr\/wmts/i;
/** Cacheable basemap + protected-area overlay hosts beyond IGN. */
const CACHEABLE_TILE_HOST_PATTERN =
	/^https:\/\/(?:data\.geopf\.fr\/wmts|[abc]\.tile\.opentopomap\.org|server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile|basemap\.nationalmap\.gov\/arcgis\/rest\/services\/|wmts\.geo\.admin\.ch\/|service\.pdok\.nl\/|maps(?:neu|[1-4])?\.wien\.gv\.at\/|cache\.kartverket\.no\/|sgx\.geodatenzentrum\.de\/wmts_basemapde\/|www\.ign\.es\/wmts\/|bio\.discomap\.eea\.europa\.eu\/arcgis\/rest\/services\/|edits\.nationalmap\.gov\/arcgis\/rest\/services\/PAD-US\/|maps-cartes\.ec\.gc\.ca\/arcgis\/rest\/services\/CWS_SCF\/CPCAD\/|mapserver\.doc\.govt\.nz\/arcgis\/rest\/services\/|environment\.data\.gov\.uk\/|ogc\.nature\.scot\/|datamap\.gov\.wales\/|ccff02\.minfin\.fgov\.be\/geoservices\/|api\.os\.uk\/maps\/)/i;

const MAX_ENTRIES = 10_000;
export const MAX_TILE_CACHE_BYTES = 200 * 1024 * 1024;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_WRITE_INTERVAL = 50;
const PRUNE_CHUNK_SIZE = 100;
const PREFETCH_CONCURRENCY = 4;
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

function tileResponse(tile: CachedTile, url: string): Response {
	return new Response(tile.data, {
		status: 200,
		headers: { 'Content-Type': tile.contentType ?? contentTypeForUrl(url) }
	});
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

async function persistStatsMetadata(): Promise<void> {
	if (!statsMetadata) {
		return;
	}
	await set(TILE_CACHE_STATS_METADATA_KEY, statsMetadata, tileStore);
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

	const stored = await get<TileCacheStatsMetadata>(TILE_CACHE_STATS_METADATA_KEY, tileStore);
	if (stored && stored.updatedAt > 0) {
		statsMetadata = stored;
		statsMetadataLoaded = true;
		return stored;
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
	const entry = await get<CachedTile>(url, tileStore);
	if (!entry) {
		return null;
	}
	if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
		await removeCachedTile(url, entry);
		return null;
	}
	memoryCache.put(url, entry);
	return entry;
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
	const cachedAt = Date.now();
	const storedData = data.slice(0);
	const entry: CachedTile = { data: storedData, cachedAt, contentType };
	const previous = await get<CachedTile>(url, tileStore);

	memoryCache.put(url, entry);
	await set(url, entry, tileStore);

	await ensureStatsMetadataLoaded();
	if (previous) {
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
		await persistStatsMetadata();
	}
}

async function loadIgnTileFromNetwork(
	url: string,
	init?: RequestInit,
	options?: { deferStatsPersist?: boolean }
): Promise<CachedTile> {
	const fromIdb = await getCachedTileFromIdb(url);
	if (fromIdb) {
		return fromIdb;
	}

	if (!isApiEnabled('ignMap')) {
		throw new Error('IGN map API disabled');
	}

	const fetchImpl = originalFetch ?? fetch;
	const response = await fetchImpl(url, init);
	if (!response.ok) {
		throw new Error(`Tile fetch failed: ${response.status}`);
	}

	const data = await response.arrayBuffer();
	const contentType = response.headers.get('Content-Type') ?? contentTypeForUrl(url);
	await persistCachedTile(url, data, contentType, options?.deferStatsPersist ?? false);
	schedulePruneCache();

	const cached = getCachedTileFromMemory(url);
	if (cached) {
		return cached;
	}

	return {
		data: data.slice(0),
		cachedAt: Date.now(),
		contentType
	};
}

function acquireIgnTileLoad(
	url: string,
	init?: RequestInit,
	options?: { deferStatsPersist?: boolean }
): Promise<CachedTile> {
	let pending = inFlightNetworkFetches.get(url);
	if (!pending) {
		pending = loadIgnTileFromNetwork(url, init, options);
		inFlightNetworkFetches.set(url, pending);
		void pending.finally(() => {
			inFlightNetworkFetches.delete(url);
		});
	}
	return pending;
}

async function resolveIgnTileFromNetwork(
	url: string,
	init?: RequestInit,
	options?: { deferStatsPersist?: boolean }
): Promise<CachedTile> {
	return acquireIgnTileLoad(url, init, options);
}

async function fetchIgnTile(
	url: string,
	_fetchImpl: typeof fetch,
	_input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const startedAt = performance.now();
	const fromMemory = getCachedTileFromMemory(url);
	if (fromMemory) {
		recordFetchPerf('memory', performance.now() - startedAt);
		return tileResponse(fromMemory, url);
	}

	if (!isApiEnabled('ignMap')) {
		return new Response(null, { status: 503, statusText: 'Service Unavailable' });
	}

	try {
		const tile = await acquireIgnTileLoad(url, init);
		recordFetchPerf('network', performance.now() - startedAt);
		return tileResponse(tile, url);
	} catch (error) {
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
			return fetchIgnTile(url, original, input, init);
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
	const allKeys = await keys(tileStore);
	for (const key of allKeys) {
		await del(String(key), tileStore);
	}

	memoryCache.clear();
	statsMetadata = createEmptyTileCacheStats();
	statsMetadataLoaded = true;
	await persistStatsMetadata();
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

export function getDownloadZoomLevels(currentZoom: number, maxZoom: number): number[] {
	const zoom = Math.min(Math.round(currentZoom), maxZoom);
	return [Math.max(10, zoom - 1), zoom].filter(
		(value, index, array) => array.indexOf(value) === index
	);
}

export const DOWNLOAD_SELECTION_FRACTION = 0.25;

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

export function boundsFromMapCenter(
	map: {
		getContainer: () => HTMLElement;
		unproject: (point: [number, number]) => { lng: number; lat: number };
	},
	fraction = DOWNLOAD_SELECTION_FRACTION
): TileBounds {
	const container = map.getContainer();
	const width = container.clientWidth;
	const height = container.clientHeight;
	const boxWidth = width * fraction;
	const boxHeight = height * fraction;
	const left = (width - boxWidth) / 2;
	const top = (height - boxHeight) / 2;

	const northWest = map.unproject([left, top]);
	const southEast = map.unproject([left + boxWidth, top + boxHeight]);

	return {
		west: northWest.lng,
		north: northWest.lat,
		east: southEast.lng,
		south: southEast.lat
	};
}

export type PrefetchTilesOptions = {
	signal?: AbortSignal;
	onProgress?: (done: number, total: number) => void;
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
	const { signal, onProgress } = options;

	const expanded = expandBounds(bounds);
	const urls: string[] = [];

	for (const zoom of zoomLevels) {
		const min = lngLatToTile(expanded.west, expanded.north, zoom);
		const max = lngLatToTile(expanded.east, expanded.south, zoom);

		for (let x = min.x; x <= max.x; x += 1) {
			for (let y = min.y; y <= max.y; y += 1) {
				urls.push(buildUrl(zoom, x, y));
			}
		}
	}

	let fetched = 0;
	let failed = 0;
	let completed = 0;

	async function prefetchUrl(url: string): Promise<void> {
		try {
			if (signal?.aborted) {
				throw new DOMException('Aborted', 'AbortError');
			}

			const cached = await getCachedTile(url);
			if (!cached) {
				await resolveIgnTileFromNetwork(url, { signal }, { deferStatsPersist: true });
				fetched += 1;
			}
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
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
