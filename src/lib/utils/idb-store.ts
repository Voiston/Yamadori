/** Serialize to a plain JSON value safe for IndexedDB structured clone. */
export function toStorable<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, v) => (v instanceof Uint8Array ? [...v] : v))
	) as T;
}
