import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import type { Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { toStorable } from '$lib/utils/idb-store';
import {
	collectMediaIdsForTree,
	mediaRecordToDataUrl,
	normalizeStoredMediaRecord,
	storedRecordToTree,
	treeToStoredRecord
} from './codec';
import { persistTreeIndexFromTrees, persistTreeRecord } from './persist';
import {
	hydrateTreeMedia,
	loadTreesFromStorage,
	persistDirtyTrees,
	resetTreeStorageCacheForTests
} from './repository';
import type { StoredMediaRecord, StoredTreeRecord } from './types';
import { STORAGE_KEY_INDEX, STORAGE_KEY_LEGACY, mediaStorageKey, treeStorageKey } from './types';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();

vi.mock('idb-keyval', () => ({
	get: (...args: unknown[]) => mockGet(...args),
	set: (...args: unknown[]) => mockSet(...args),
	del: (...args: unknown[]) => mockDel(...args),
	keys: (...args: unknown[]) => mockKeys(...args)
}));

vi.mock('$lib/utils/secure-idb', () => ({
	secureIdbGet: (...args: unknown[]) => mockGet(...args),
	secureIdbSet: (...args: unknown[]) => mockSet(...args),
	secureIdbDel: (...args: unknown[]) => mockDel(...args),
	isMigrationBlockedError: vi.fn().mockReturnValue(false)
}));

const tinyJpeg =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

function sampleTree(): Tree {
	const capturedAt = '2026-01-01T12:00:00.000Z';
	return {
		id: 'tree-a',
		species: 'Oak',
		notes: 'Note',
		photos: [tinyJpeg],
		photoThumbs: [tinyJpeg],
		visits: [
			{
				id: 'visit-1',
				visitedAt: capturedAt,
				note: 'Visit',
				photoBase64: tinyJpeg,
				photoThumbBase64: tinyJpeg
			}
		],
		assessment: { ...DEFAULT_ASSESSMENT },
		voiceNote: null,
		latitude: 48.8,
		longitude: 2.3,
		accuracyMeters: 5,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		capturedAt
	};
}

describe('tree-storage codec', () => {
	it('round-trips tree metadata with externalized media refs', () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);

		expect(stored.visits[0]?.photoFullId).toBeTruthy();
		expect(mediaById.size).toBeGreaterThan(0);

		const hydrated = storedRecordToTree(stored, mediaById, 'full');
		expect(hydrated.photos[0]).toBe(tree.photos[0]);
		expect(hydrated.visits[0]?.photoBase64).toBe(tinyJpeg);
	});

	it('loads thumbs without full photo bytes in memory', () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);
		const thumbOnly = new Map<string, StoredMediaRecord>();
		const thumbId = stored.visits[0]?.photoThumbId;
		if (thumbId) {
			const record = mediaById.get(thumbId);
			if (record) thumbOnly.set(thumbId, record);
		}

		const hydrated = storedRecordToTree(stored, thumbOnly, 'thumbs');
		expect(hydrated.photos).toEqual([]);
		expect(hydrated.photoThumbs?.[0]).toBe(tinyJpeg);
	});

	it('collects only thumb media ids for list hydration', () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);
		const ids = collectMediaIdsForTree(stored, 'thumbs');
		expect(ids.length).toBeGreaterThan(0);
		expect(ids).toContain(stored.visits[0]?.photoThumbId);
	});

	it('normalizes number[] media bytes after JSON round-trip', () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);
		const thumbId = stored.visits[0]?.photoThumbId;
		expect(thumbId).toBeTruthy();
		const record = mediaById.get(thumbId!)!;
		const jsonRoundTripped = toStorable(record);
		expect(Array.isArray(jsonRoundTripped.data)).toBe(true);

		const normalized = normalizeStoredMediaRecord(jsonRoundTripped);
		expect(normalized.data).toBeInstanceOf(Uint8Array);
		expect(mediaRecordToDataUrl(normalized)).toBe(tinyJpeg);
	});
});

describe('tree-storage repository', () => {
	const idbStore = new Map<string, unknown>();

	beforeEach(() => {
		resetTreeStorageCacheForTests();
		idbStore.clear();
		mockGet.mockReset();
		mockSet.mockReset();
		mockDel.mockReset();
		mockKeys.mockReset();
		mockKeys.mockResolvedValue([]);

		mockSet.mockImplementation(async (key: string, value: unknown) => {
			idbStore.set(key, value);
		});
		mockGet.mockImplementation(async (key: string) => idbStore.get(key));
	});

	it('persists only dirty trees incrementally', async () => {
		const tree = sampleTree();
		await persistTreeRecord(tree);
		expect(mockSet).toHaveBeenCalled();
		const treeKeyCall = mockSet.mock.calls.find(([key]) => key === treeStorageKey(tree.id));
		expect(treeKeyCall).toBeTruthy();

		mockSet.mockClear();
		const dirty = new Set([tree.id]);
		await persistDirtyTrees([{ ...tree, species: 'Beech' }], dirty);
		const updated = mockSet.mock.calls.find(([key]) => key === treeStorageKey(tree.id))?.[1] as
			| StoredTreeRecord
			| undefined;
		expect(updated?.species).toBe('Beech');
	});

	it('loads v1 index and thumb-hydrated trees', async () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);

		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-trees-storage-version') return 1;
			if (key === STORAGE_KEY_INDEX) {
				return [
					{
						id: tree.id,
						species: tree.species,
						capturedAt: tree.capturedAt,
						isFavorite: false,
						latitude: tree.latitude,
						longitude: tree.longitude,
						coverThumbId: stored.visits[0]?.photoThumbId ?? null
					}
				];
			}
			if (key === treeStorageKey(tree.id)) return stored;
			for (const [mediaId, record] of mediaById.entries()) {
				if (key === mediaStorageKey(mediaId)) return record;
			}
			if (key === STORAGE_KEY_LEGACY) return undefined;
			return undefined;
		});

		const loaded = await loadTreesFromStorage('thumbs');
		expect(loaded).toHaveLength(1);
		expect(loaded[0]?.photoThumbs?.[0]).toBe(tinyJpeg);
		expect(loaded[0]?.photos).toEqual([]);
	});

	it('hydrates full photos after thumbs-only boot load', async () => {
		const tree = sampleTree();
		const mediaById = new Map<string, StoredMediaRecord>();
		const stored = treeToStoredRecord(tree, mediaById);

		mockGet.mockImplementation(async (key: string) => {
			if (key === 'yamadori-trees-storage-version') return 1;
			if (key === STORAGE_KEY_INDEX) {
				return [
					{
						id: tree.id,
						species: tree.species,
						capturedAt: tree.capturedAt,
						isFavorite: false,
						latitude: tree.latitude,
						longitude: tree.longitude,
						coverThumbId: stored.visits[0]?.photoThumbId ?? null
					}
				];
			}
			if (key === treeStorageKey(tree.id)) return stored;
			for (const [mediaId, record] of mediaById.entries()) {
				if (key === mediaStorageKey(mediaId)) return record;
			}
			if (key === STORAGE_KEY_LEGACY) return undefined;
			return undefined;
		});

		const thumbsLoaded = await loadTreesFromStorage('thumbs');
		expect(thumbsLoaded[0]?.photos).toEqual([]);
		expect(thumbsLoaded[0]?.photoThumbs?.[0]).toBe(tinyJpeg);
		expect(thumbsLoaded[0]?.visits[0]?.photoBase64).toBe('');

		const full = await hydrateTreeMedia(tree.id);
		expect(full?.photos[0]).toBe(tinyJpeg);
		expect(full?.photoThumbs?.[0]).toBe(tinyJpeg);
		expect(full?.visits[0]?.photoBase64).toBe(tinyJpeg);
	});

	it('round-trips persist and reload with thumb hydration', async () => {
		idbStore.set('yamadori-trees-storage-version', 1);
		const tree = sampleTree();
		const stored = await persistTreeRecord(tree);
		await persistTreeIndexFromTrees([tree], new Map([[tree.id, stored]]));

		const loaded = await loadTreesFromStorage('thumbs');
		expect(loaded).toHaveLength(1);
		expect(loaded[0]?.photoThumbs?.[0]).toBe(tinyJpeg);
		expect(loaded[0]?.visits[0]?.photoThumbBase64).toBe(tinyJpeg);
	});

	it('writes index coverThumbId matching persisted tree media refs', async () => {
		idbStore.set('yamadori-trees-storage-version', 1);
		const tree = sampleTree();
		const stored = await persistTreeRecord(tree);
		await persistTreeIndexFromTrees([tree], new Map([[tree.id, stored]]));

		const storedOnDisk = idbStore.get(treeStorageKey(tree.id)) as StoredTreeRecord;
		const index = idbStore.get(STORAGE_KEY_INDEX) as {
			id: string;
			coverThumbId: string | null;
		}[];

		expect(storedOnDisk).toBeTruthy();
		expect(index).toHaveLength(1);
		expect(index[0]?.coverThumbId).toBe(storedOnDisk.visits[0]?.photoThumbId);
		expect(idbStore.has(mediaStorageKey(storedOnDisk.visits[0]!.photoThumbId))).toBe(true);
	});

	it('builds index from persisted records without re-reading each tree record', async () => {
		idbStore.set('yamadori-trees-storage-version', 1);
		const tree = sampleTree();
		const stored = await persistTreeRecord(tree);
		mockGet.mockClear();

		await persistTreeIndexFromTrees([tree], new Map([[tree.id, stored]]));

		const treeRecordReads = mockGet.mock.calls.filter(
			([key]) => typeof key === 'string' && key.startsWith('yamadori-tree-')
		);
		expect(treeRecordReads).toHaveLength(0);
	});
});
