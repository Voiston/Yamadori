/**
 * Coalesce concurrent async work for the same key into a single Promise.
 * The map entry is cleared when the promise settles (success or failure).
 */
export function createInFlightMap<T>(): {
	run: (key: string, factory: () => Promise<T>) => Promise<T>;
	has: (key: string) => boolean;
	clear: () => void;
} {
	const pending = new Map<string, Promise<T>>();

	return {
		has(key: string): boolean {
			return pending.has(key);
		},
		clear(): void {
			pending.clear();
		},
		run(key: string, factory: () => Promise<T>): Promise<T> {
			const existing = pending.get(key);
			if (existing) return existing;

			const promise = factory().finally(() => {
				if (pending.get(key) === promise) {
					pending.delete(key);
				}
			});
			pending.set(key, promise);
			return promise;
		}
	};
}
