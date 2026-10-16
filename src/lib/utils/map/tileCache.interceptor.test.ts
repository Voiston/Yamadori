import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const idbGet = vi.fn();
const idbSet = vi.fn();
const idbDel = vi.fn();
const idbKeys = vi.fn().mockResolvedValue([]);
const idbClear = vi.fn().mockResolvedValue(undefined);

vi.mock('idb-keyval', () => ({
	createStore: vi.fn(() => ({})),
	get: (...args: unknown[]) => idbGet(...args),
	set: (...args: unknown[]) => idbSet(...args),
	del: (...args: unknown[]) => idbDel(...args),
	keys: (...args: unknown[]) => idbKeys(...args),
	clear: (...args: unknown[]) => idbClear(...args)
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

	it('skips tiles rejected by includeTile', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();
		const included = new Set<string>();

		await tileCache.prefetchTilesForBounds(
			{ west: 2.3, south: 48.8, east: 2.4, north: 48.9 },
			[10],
			(z, x, y) =>
				`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=test&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`,
			{
				includeTile: (z, x, y) => {
					if (included.size === 0) {
						included.add(`${z}/${x}/${y}`);
						return true;
					}
					return included.has(`${z}/${x}/${y}`);
				}
			}
		);

		expect(included.size).toBe(1);
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('returns network bytes when IndexedDB writes fail', async () => {
		idbSet.mockRejectedValue(new Error('QuotaExceededError'));
		const body = new Uint8Array([9, 8, 7, 6]).buffer;
		const { networkFetch } = await setupInterceptor(body);

		const response = await fetch(TILE_URL);

		expect(response.status).toBe(200);
		expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([9, 8, 7, 6]);
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('falls back to the network when IndexedDB reads fail', async () => {
		idbGet.mockRejectedValue(new Error('InvalidStateError'));
		const { networkFetch } = await setupInterceptor();

		const response = await fetch(TILE_URL);

		expect(response.ok).toBe(true);
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('clears the cache in one transaction and refetches the next tile', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();

		await fetch(TILE_URL);
		expect(networkFetch).toHaveBeenCalledTimes(1);

		await tileCache.clearTileCache();
		const stats = await tileCache.getTileCacheStats();

		expect(idbClear).toHaveBeenCalledTimes(1);
		expect(stats.count).toBe(0);
		expect(stats.bytes).toBe(0);

		await fetch(TILE_URL);
		expect(networkFetch).toHaveBeenCalledTimes(2);
	});

	it('does not fail a later request when an earlier caller aborts', async () => {
		let resolveNetwork: (value: unknown) => void = () => {};
		const networkFetch = vi.fn().mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveNetwork = resolve;
				})
		);
		vi.stubGlobal('fetch', networkFetch);
		const tileCache = await import('./tileCache');
		tileCache.registerTileCacheInterceptor();

		const controller = new AbortController();
		const first = fetch(TILE_URL, { signal: controller.signal });
		await vi.waitFor(() => {
			expect(networkFetch).toHaveBeenCalledTimes(1);
		});
		controller.abort();
		const second = fetch(TILE_URL);
		resolveNetwork({
			ok: true,
			arrayBuffer: async () => new Uint8Array([5, 6, 7, 8]).buffer,
			headers: { get: () => 'image/png' }
		});

		await expect(first).rejects.toMatchObject({ name: 'AbortError' });
		await expect(second).resolves.toMatchObject({ ok: true, status: 200 });
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	function tileHttpResponse(status: number, retryAfter?: string) {
		return {
			ok: status >= 200 && status < 300,
			status,
			headers: {
				get: (name: string) => {
					if (name.toLowerCase() === 'retry-after') return retryAfter ?? null;
					if (name.toLowerCase() === 'content-type') return 'image/png';
					return null;
				}
			},
			arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer
		};
	}

	function selectTiles(limit: number) {
		const ids: string[] = [];
		return {
			ids,
			includeTile: (z: number, x: number, y: number) => {
				const id = `${z}/${x}/${y}`;
				if (ids.includes(id)) return true;
				if (ids.length >= limit) return false;
				ids.push(id);
				return true;
			},
			buildUrl: (z: number, x: number, y: number) =>
				`https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=test&STYLE=normal&FORMAT=image/png&TILEMATRIXSET=PM&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}`
		};
	}

	const packBounds = { west: 2.3, south: 48.8, east: 2.4, north: 48.9 };

	it('retries a 429 and keeps the tile', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();
		let calls = 0;
		networkFetch.mockImplementation(async () => {
			calls += 1;
			return calls === 1 ? tileHttpResponse(429, '0') : tileHttpResponse(200);
		});
		const tiles = selectTiles(1);

		const result = await tileCache.prefetchTilesForBounds(packBounds, [10], tiles.buildUrl, {
			includeTile: tiles.includeTile
		});

		expect(result).toEqual({ fetched: 1, failed: 0 });
		expect(calls).toBe(2);
	});

	it('does not retry a missing tile', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();
		networkFetch.mockImplementation(async () => tileHttpResponse(404));
		const tiles = selectTiles(1);

		const result = await tileCache.prefetchTilesForBounds(packBounds, [10], tiles.buildUrl, {
			includeTile: tiles.includeTile
		});

		expect(result).toEqual({ fetched: 0, failed: 1 });
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('gives up on a tile after five 429 responses', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();
		networkFetch.mockImplementation(async () => tileHttpResponse(429, '0'));
		const tiles = selectTiles(1);

		const result = await tileCache.prefetchTilesForBounds(packBounds, [10], tiles.buildUrl, {
			includeTile: tiles.includeTile
		});

		expect(result).toEqual({ fetched: 0, failed: 1 });
		expect(networkFetch).toHaveBeenCalledTimes(5);
	});

	it('does not retry a 429 while browsing the map', async () => {
		const { networkFetch } = await setupInterceptor();
		networkFetch.mockImplementation(async () => tileHttpResponse(429, '5'));

		const response = await fetch(TILE_URL);

		expect(response.status).toBe(429);
		expect(networkFetch).toHaveBeenCalledTimes(1);
	});

	it('pauses the whole queue after a 429', async () => {
		vi.useFakeTimers();
		try {
			const { tileCache, networkFetch } = await setupInterceptor();
			const tiles = selectTiles(5);
			let releaseOk: () => void = () => {};
			const okGate = new Promise<void>((resolve) => {
				releaseOk = resolve;
			});
			let limited = false;
			const started: string[] = [];
			networkFetch.mockImplementation(async (input: RequestInfo | URL) => {
				const url = String(input);
				started.push(url);
				const [z, x, y] = tiles.ids[0].split('/');
				const first = tiles.buildUrl(Number(z), Number(x), Number(y));
				if (url === first && !limited) {
					limited = true;
					return tileHttpResponse(429, '2');
				}
				await okGate;
				return tileHttpResponse(200);
			});

			const pending = tileCache.prefetchTilesForBounds(packBounds, [10], tiles.buildUrl, {
				includeTile: tiles.includeTile
			});
			const fifth = () => {
				const [z, x, y] = tiles.ids[4].split('/');
				return tiles.buildUrl(Number(z), Number(x), Number(y));
			};
			for (let step = 0; step < 20 && started.length < 4; step += 1) {
				await vi.advanceTimersByTimeAsync(0);
			}
			expect(started).toHaveLength(4);
			await vi.advanceTimersByTimeAsync(0);
			expect(started).not.toContain(fifth());
			releaseOk();
			await vi.advanceTimersByTimeAsync(0);
			expect(started).not.toContain(fifth());
			await vi.advanceTimersByTimeAsync(2_000);
			await expect(pending).resolves.toEqual({ fetched: 5, failed: 0 });
			expect(started).toContain(fifth());
		} finally {
			vi.useRealTimers();
		}
	});

	it('stops the 429 wait when the pack is cancelled', async () => {
		const { tileCache, networkFetch } = await setupInterceptor();
		const controller = new AbortController();
		let saw429: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			saw429 = resolve;
		});
		networkFetch.mockImplementation(async () => {
			saw429();
			return tileHttpResponse(429, '30');
		});
		const tiles = selectTiles(1);
		const pending = tileCache.prefetchTilesForBounds(packBounds, [10], tiles.buildUrl, {
			includeTile: tiles.includeTile,
			signal: controller.signal
		});
		await gate;
		controller.abort();
		await expect(pending).resolves.toEqual({ fetched: 0, failed: 0 });
	});
});

describe('tile cache limits', () => {
	it('exposes a byte budget for IndexedDB tiles', async () => {
		const { MAX_TILE_CACHE_BYTES } = await import('./tileCache');
		expect(MAX_TILE_CACHE_BYTES).toBe(1500 * 1024 * 1024);
	});
});
