import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const idbGet = vi.fn();
const idbSet = vi.fn();
const idbDel = vi.fn();
const idbKeys = vi.fn().mockResolvedValue([]);

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({})),
	get: (...args: unknown[]) => idbGet(...args),
	set: (...args: unknown[]) => idbSet(...args),
	del: (...args: unknown[]) => idbDel(...args),
	keys: (...args: unknown[]) => idbKeys(...args)
}));

vi.mock('$lib/utils/apiPolicy', () => ({
	isApiEnabled: vi.fn(() => true)
}));

const TILE_URL =
	'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=test&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX=10&TILEROW=1&TILECOL=2';

describe('tile cache interceptor', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.stubGlobal('window', globalThis);
		idbGet.mockResolvedValue(undefined);
		idbSet.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function setupInterceptor(
		networkBody: ArrayBuffer = new Uint8Array([1, 2, 3, 4]).buffer
	) {
		const networkFetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: async () => networkBody,
			headers: {
				get: () => 'image/png'
			}
		});
		vi.stubGlobal('fetch', networkFetch);

		const tileCache = await import('./tileCache');
		tileCache.registerTileCacheInterceptor();
		return { tileCache, networkFetch };
	}

	it('deduplicates concurrent network fetches for the same tile', async () => {
		const { networkFetch } = await setupInterceptor();

		const [first, second] = await Promise.all([fetch(TILE_URL), fetch(TILE_URL)]);

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('serves subsequent tile requests from memory without another network fetch', async () => {
		const { networkFetch } = await setupInterceptor();

		await fetch(TILE_URL);
		await fetch(TILE_URL);

		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('persists each prefetched tile only once', async () => {
		const { tileCache } = await setupInterceptor();

		await tileCache.prefetchTilesForBounds(
			{ west: 2.3, south: 48.8, east: 2.31, north: 48.81 },
			[10],
			(_z, _x, _y) => TILE_URL
		);

		const tileWrites = idbSet.mock.calls.filter(([key]) => key === TILE_URL);
		expect(tileWrites).toHaveLength(1);
	});
});

describe('tile cache limits', () => {
	it('exposes a byte budget for IndexedDB tiles', async () => {
		const { MAX_TILE_CACHE_BYTES } = await import('./tileCache');
		expect(MAX_TILE_CACHE_BYTES).toBe(200 * 1024 * 1024);
	});
});
