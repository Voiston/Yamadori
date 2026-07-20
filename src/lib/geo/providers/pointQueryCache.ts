import { createInFlightMap } from '$lib/utils/inFlight';

const MEMORY_CACHE_TTL_MS = 30 * 60_000;
const COORD_PRECISION = 4;

type MemoryEntry<T> = {
	expiresAt: number;
	value: T;
};

function pointKey(latitude: number, longitude: number): string {
	return `${latitude.toFixed(COORD_PRECISION)},${longitude.toFixed(COORD_PRECISION)}`;
}

/**
 * Short-lived memory + in-flight coalesce for point queries shared by cadastre and protected.
 */
export function createPointQueryCache<T>(): {
	getOrFetch: (
		latitude: number,
		longitude: number,
		fetcher: () => Promise<T>
	) => Promise<T>;
	clear: () => void;
} {
	const memory = new Map<string, MemoryEntry<T>>();
	const inFlight = createInFlightMap<T>();

	function read(key: string): T | undefined {
		const entry = memory.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt <= Date.now()) {
			memory.delete(key);
			return undefined;
		}
		return entry.value;
	}

	function write(key: string, value: T): void {
		memory.set(key, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS });
	}

	return {
		clear() {
			memory.clear();
			inFlight.clear();
		},
		getOrFetch(latitude, longitude, fetcher) {
			const key = pointKey(latitude, longitude);
			const cached = read(key);
			if (cached !== undefined) return Promise.resolve(cached);

			return inFlight.run(key, async () => {
				const again = read(key);
				if (again !== undefined) return again;
				const value = await fetcher();
				write(key, value);
				return value;
			});
		}
	};
}
