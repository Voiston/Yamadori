import { createStore, del, get, keys, set } from 'idb-keyval';

const tileStore = createStore('yamadori-tile-cache', 'tiles');
const IGN_TILE_PATTERN = /^https:\/\/data\.geopf\.fr\/wmts/i;

const MAX_ENTRIES = 10_000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_WRITE_INTERVAL = 50;
const PREFETCH_CONCURRENCY = 4;

type CachedTile = {
	data: ArrayBuffer;
	cachedAt: number;
	contentType: string;
};

let interceptorRegistered = false;
let writesSincePrune = 0;
let pruneInFlight: Promise<void> | null = null;

function isIgnTileUrl(url: string): boolean {
	return IGN_TILE_PATTERN.test(url);
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

async function pruneCache(): Promise<void> {
	const allKeys = await keys(tileStore);
	if (allKeys.length <= MAX_ENTRIES) {
		return;
	}

	const entries: { key: string; cachedAt: number }[] = [];
	for (const key of allKeys) {
		const entry = await get<CachedTile>(key, tileStore);
		if (!entry) {
			await del(key, tileStore);
			continue;
		}
		if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
			await del(key, tileStore);
			continue;
		}
		entries.push({ key: String(key), cachedAt: entry.cachedAt });
	}

	entries.sort((a, b) => a.cachedAt - b.cachedAt);
	const toRemove = entries.length - MAX_ENTRIES;
	for (let index = 0; index < toRemove; index += 1) {
		await del(entries[index].key, tileStore);
	}
}

async function schedulePruneCache(): Promise<void> {
	writesSincePrune += 1;
	if (writesSincePrune < PRUNE_WRITE_INTERVAL) {
		return;
	}
	writesSincePrune = 0;
	if (pruneInFlight) {
		await pruneInFlight;
		return;
	}
	pruneInFlight = pruneCache();
	try {
		await pruneInFlight;
	} finally {
		pruneInFlight = null;
	}
}

async function getCachedTile(url: string): Promise<CachedTile | null> {
	const entry = await get<CachedTile>(url, tileStore);
	if (!entry) {
		return null;
	}
	if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
		await del(url, tileStore);
		return null;
	}
	return entry;
}

async function setCachedTile(url: string, data: ArrayBuffer, contentType: string): Promise<void> {
	await set(url, { data, cachedAt: Date.now(), contentType }, tileStore);
	void schedulePruneCache();
}

async function fetchIgnTile(
	url: string,
	fetchImpl: typeof fetch,
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const cached = await getCachedTile(url);
	if (cached) {
		return new Response(cached.data.slice(0), {
			status: 200,
			headers: { 'Content-Type': cached.contentType ?? contentTypeForUrl(url) }
		});
	}

	const response = await fetchImpl(input, init);
	if (!response.ok) {
		return response;
	}

	const data = await response.clone().arrayBuffer();
	const contentType = response.headers.get('Content-Type') ?? contentTypeForUrl(url);
	await setCachedTile(url, data, contentType);

	return new Response(data.slice(0), {
		status: 200,
		headers: { 'Content-Type': contentType }
	});
}

export function registerTileCacheInterceptor(): void {
	if (interceptorRegistered || typeof window === 'undefined') {
		return;
	}

	const originalFetch = window.fetch.bind(window);

	window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const url = requestUrl(input);
		if (isIgnTileUrl(url)) {
			return fetchIgnTile(url, originalFetch, input, init);
		}
		return originalFetch(input, init);
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
	const allKeys = await keys(tileStore);
	let oldestAt: number | null = null;
	let bytes = 0;

	for (const key of allKeys) {
		const entry = await get<CachedTile>(key, tileStore);
		if (!entry) {
			await del(key, tileStore);
			continue;
		}
		if (Date.now() - entry.cachedAt > MAX_AGE_MS) {
			await del(key, tileStore);
			continue;
		}
		bytes += entry.data.byteLength;
		if (oldestAt === null || entry.cachedAt < oldestAt) {
			oldestAt = entry.cachedAt;
		}
	}

	const remaining = await keys(tileStore);
	return { count: remaining.length, bytes, oldestAt };
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
		await del(key, tileStore);
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

export async function prefetchTilesForBounds(
	bounds: TileBounds,
	zoomLevels: number[],
	buildUrl: (z: number, x: number, y: number) => string,
	onProgress?: (done: number, total: number) => void
): Promise<{ fetched: number; failed: number }> {
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
	const controller = new AbortController();

	async function prefetchUrl(url: string): Promise<void> {
		try {
			const cached = await getCachedTile(url);
			if (!cached) {
				const response = await fetch(url, { signal: controller.signal });
				if (!response.ok) {
					failed += 1;
				} else {
					const data = await response.arrayBuffer();
					const contentType = response.headers.get('Content-Type') ?? contentTypeForUrl(url);
					await setCachedTile(url, data, contentType);
					fetched += 1;
				}
			}
		} catch {
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
			const url = urls[nextIndex];
			nextIndex += 1;
			await prefetchUrl(url);
		}
	}

	await Promise.all(Array.from({ length: workerCount }, () => worker()));

	if (writesSincePrune > 0) {
		writesSincePrune = PRUNE_WRITE_INTERVAL;
		await schedulePruneCache();
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
