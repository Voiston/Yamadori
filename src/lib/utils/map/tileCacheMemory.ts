export type MemoryCachedTile = {
	data: ArrayBuffer;
	cachedAt: number;
	contentType: string;
};

export class MemoryTileCache {
	private entries = new Map<string, MemoryCachedTile>();
	private bytes = 0;

	constructor(
		private readonly maxEntries: number,
		private readonly maxBytes: number,
		private readonly maxAgeMs: number
	) {}

	get(url: string, now = Date.now()): MemoryCachedTile | null {
		const entry = this.entries.get(url);
		if (!entry) {
			return null;
		}
		if (now - entry.cachedAt > this.maxAgeMs) {
			this.remove(url);
			return null;
		}

		this.entries.delete(url);
		this.entries.set(url, entry);
		return entry;
	}

	put(url: string, entry: MemoryCachedTile): void {
		if (this.entries.has(url)) {
			this.remove(url);
		}

		this.entries.set(url, entry);
		this.bytes += entry.data.byteLength;
		this.evict();
	}

	remove(url: string): void {
		const entry = this.entries.get(url);
		if (!entry) {
			return;
		}

		this.bytes -= entry.data.byteLength;
		this.entries.delete(url);
	}

	clear(): void {
		this.entries.clear();
		this.bytes = 0;
	}

	get size(): number {
		return this.entries.size;
	}

	get totalBytes(): number {
		return this.bytes;
	}

	private evict(): void {
		while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
			const oldestKey = this.entries.keys().next().value;
			if (oldestKey === undefined) {
				break;
			}
			this.remove(oldestKey);
		}
	}
}
