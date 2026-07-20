import { createInFlightMap } from '$lib/utils/inFlight';

export type GeoJsonGeometry = {
	type: string;
	coordinates: unknown;
};

const COORD_PRECISION = 4;
const MEMORY_TTL_MS = 30 * 60_000;
const memory = new Map<string, { expiresAt: number; geometry: GeoJsonGeometry | null }>();
const inFlight = createInFlightMap<GeoJsonGeometry | null>();

function pointKey(latitude: number, longitude: number): string {
	return `${latitude.toFixed(COORD_PRECISION)},${longitude.toFixed(COORD_PRECISION)}`;
}

/**
 * Shared FR Apicarto parcelle geometry (cadastre + protected scans).
 * Memory-only — geometry is large and short-lived for a session pin.
 */
export function readCachedParcelGeometry(
	latitude: number,
	longitude: number
): GeoJsonGeometry | null | undefined {
	const key = pointKey(latitude, longitude);
	const entry = memory.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		memory.delete(key);
		return undefined;
	}
	return entry.geometry;
}

export function writeCachedParcelGeometry(
	latitude: number,
	longitude: number,
	geometry: GeoJsonGeometry | null
): void {
	const key = pointKey(latitude, longitude);
	memory.set(key, { geometry, expiresAt: Date.now() + MEMORY_TTL_MS });
}

export async function getOrFetchParcelGeometry(
	latitude: number,
	longitude: number,
	fetcher: () => Promise<GeoJsonGeometry | null>
): Promise<GeoJsonGeometry | null> {
	const key = pointKey(latitude, longitude);
	const cached = readCachedParcelGeometry(latitude, longitude);
	if (cached !== undefined) return cached;

	return inFlight.run(key, async () => {
		const again = readCachedParcelGeometry(latitude, longitude);
		if (again !== undefined) return again;
		const geometry = await fetcher();
		writeCachedParcelGeometry(latitude, longitude, geometry);
		return geometry;
	});
}

export function clearParcelGeometryMemoryCache(): void {
	memory.clear();
	inFlight.clear();
}
