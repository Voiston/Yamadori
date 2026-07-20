export type TileCacheStatsMetadata = {
	count: number;
	bytes: number;
	oldestAt: number | null;
	updatedAt: number;
};

export const TILE_CACHE_STATS_METADATA_KEY = '__yamadori_tile_cache_stats__';

export function createEmptyTileCacheStats(now = Date.now()): TileCacheStatsMetadata {
	return {
		count: 0,
		bytes: 0,
		oldestAt: null,
		updatedAt: now
	};
}

export function applyTileCacheStatsOnAdd(
	stats: TileCacheStatsMetadata,
	byteLength: number,
	cachedAt: number,
	now = Date.now()
): TileCacheStatsMetadata {
	return {
		count: stats.count + 1,
		bytes: stats.bytes + byteLength,
		oldestAt:
			stats.oldestAt === null || cachedAt < stats.oldestAt ? cachedAt : stats.oldestAt,
		updatedAt: now
	};
}

export function applyTileCacheStatsOnReplace(
	stats: TileCacheStatsMetadata,
	previousByteLength: number,
	nextByteLength: number,
	now = Date.now()
): TileCacheStatsMetadata {
	return {
		...stats,
		bytes: stats.bytes - previousByteLength + nextByteLength,
		updatedAt: now
	};
}

export function applyTileCacheStatsOnRemove(
	stats: TileCacheStatsMetadata,
	byteLength: number,
	cachedAt: number,
	now = Date.now()
): TileCacheStatsMetadata {
	const nextCount = Math.max(0, stats.count - 1);
	const nextBytes = Math.max(0, stats.bytes - byteLength);
	return {
		count: nextCount,
		bytes: nextBytes,
		oldestAt: stats.oldestAt === cachedAt ? null : stats.oldestAt,
		updatedAt: now
	};
}
