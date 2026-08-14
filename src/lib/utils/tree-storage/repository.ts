import { get } from 'idb-keyval';
import { keys } from 'idb-keyval';
import {
	secureIdbDel,
	secureIdbGet,
	secureIdbSet,
	isMigrationBlockedError
} from '$lib/utils/secure-idb';
import { toStorable } from '$lib/utils/idb-store';
import type { Tree } from '$lib/types/tree';
import {
	collectMediaIdsForTree,
	collectMediaIdsForTrees,
	mediaRecordToDataUrl,
	normalizeStoredMediaRecord,
	storedRecordToTree
} from './codec';
import type {
	StoredMediaRecord,
	StoredTreeRecord,
	TreeHydrationLevel,
	TreeIndexEntry,
	TreeStorageMigrationCallback
} from './types';
import {
	STORAGE_KEY_INDEX,
	STORAGE_KEY_LEGACY,
	STORAGE_KEY_MEDIA_PREFIX,
	TREE_STORAGE_VERSION,
	mediaStorageKey,
	treeStorageKey
} from './types';
import { migrateLegacyMonolith } from './migrate-v0';
import { persistTreeIndexFromTrees, persistTreeRecord } from './persist';
import {
	readStorageVersion,
	setCachedStorageVersion
} from './version';

type LegacyTree = Partial<Tree> & {
	photoBase64?: string;
	id: string;
	species: string;
	capturedAt: string;
};

let storageVersionCache: number | null = null;

export function resetTreeStorageCacheForTests(): void {
	storageVersionCache = null;
	setCachedStorageVersion(null);
}

export async function getTreeStorageVersion(): Promise<number> {
	if (storageVersionCache !== null) {
		return storageVersionCache;
	}

	const version = await readStorageVersion();
	if (version !== undefined && version >= 1) {
		storageVersionCache = version;
		setCachedStorageVersion(version);
		return version;
	}

	const legacy = await get<unknown>(STORAGE_KEY_LEGACY);
	if (legacy !== undefined) {
		storageVersionCache = 0;
		return 0;
	}

	storageVersionCache = TREE_STORAGE_VERSION;
	return TREE_STORAGE_VERSION;
}

export async function ensureTreeStorageMigrated(
	onProgress?: TreeStorageMigrationCallback
): Promise<void> {
	const version = await getTreeStorageVersion();
	if (version >= 1) {
		if (version < TREE_STORAGE_VERSION) {
			const { writeStorageVersion } = await import('./version');
			await writeStorageVersion(TREE_STORAGE_VERSION);
			storageVersionCache = TREE_STORAGE_VERSION;
			setCachedStorageVersion(TREE_STORAGE_VERSION);
		}
		return;
	}

	await migrateLegacyMonolith(onProgress);
	storageVersionCache = TREE_STORAGE_VERSION;
	setCachedStorageVersion(TREE_STORAGE_VERSION);
}

async function loadMediaBatch(mediaIds: string[]): Promise<Map<string, StoredMediaRecord>> {
	const map = new Map<string, StoredMediaRecord>();
	await Promise.all(
		mediaIds.map(async (mediaId) => {
			const record = await secureIdbGet<StoredMediaRecord>(mediaStorageKey(mediaId));
			if (record) {
				map.set(mediaId, normalizeStoredMediaRecord(record));
			}
		})
	);
	return map;
}

async function loadIndex(): Promise<TreeIndexEntry[]> {
	return (await secureIdbGet<TreeIndexEntry[]>(STORAGE_KEY_INDEX)) ?? [];
}

async function loadStoredTree(treeId: string): Promise<StoredTreeRecord | undefined> {
	return secureIdbGet<StoredTreeRecord>(treeStorageKey(treeId));
}

async function loadStoredTrees(treeIds: string[]): Promise<StoredTreeRecord[]> {
	const records = await Promise.all(treeIds.map((id) => loadStoredTree(id)));
	return records.filter((record): record is StoredTreeRecord => record !== undefined);
}

export async function loadTreesBootPhaseA(): Promise<Tree[]> {
	await ensureTreeStorageMigrated();

	const version = await getTreeStorageVersion();
	if (version === 0) {
		const legacy = (await secureIdbGet<LegacyTree[]>(STORAGE_KEY_LEGACY)) ?? [];
		return legacy as Tree[];
	}

	const index = await loadIndex();
	if (index.length === 0) {
		return [];
	}

	const storedRecords = await loadStoredTrees(index.map((entry) => entry.id));
	const coverThumbIds = index
		.map((entry) => entry.coverThumbId)
		.filter((id): id is string => Boolean(id));
	const mediaById = await loadMediaBatch(coverThumbIds);
	const indexById = new Map(index.map((entry) => [entry.id, entry]));

	return storedRecords.map((record) => {
		const tree = storedRecordToTree(record, mediaById, 'index');
		const entry = indexById.get(record.id);
		if (!entry?.coverThumbId) {
			return tree;
		}
		const thumbRecord = mediaById.get(entry.coverThumbId);
		if (!thumbRecord) {
			return tree;
		}
		return {
			...tree,
			photoThumbs: [mediaRecordToDataUrl(thumbRecord)]
		};
	});
}

export async function loadTreesFromStorage(
	level: TreeHydrationLevel = 'thumbs'
): Promise<Tree[]> {
	await ensureTreeStorageMigrated();

	const version = await getTreeStorageVersion();
	if (version === 0) {
		const legacy = (await secureIdbGet<LegacyTree[]>(STORAGE_KEY_LEGACY)) ?? [];
		return legacy as Tree[];
	}

	const index = await loadIndex();
	if (index.length === 0) {
		return [];
	}

	const storedRecords = await loadStoredTrees(index.map((entry) => entry.id));

	const mediaIds = collectMediaIdsForTrees(storedRecords, level);
	const mediaById = await loadMediaBatch(mediaIds);

	return storedRecords.map((record) => storedRecordToTree(record, mediaById, level));
}

export async function hydrateTreeMedia(treeId: string): Promise<Tree | undefined> {
	const stored = await loadStoredTree(treeId);
	if (!stored) {
		return undefined;
	}

	const mediaIds = collectMediaIdsForTree(stored, 'full');
	const mediaById = await loadMediaBatch(mediaIds);
	return storedRecordToTree(stored, mediaById, 'full');
}

export async function persistDirtyTrees(trees: Tree[], dirtyTreeIds: Set<string>): Promise<void> {
	if (dirtyTreeIds.size === 0) {
		return;
	}

	const updatedRecords = new Map<string, StoredTreeRecord>();
	let indexDirty = false;

	for (const treeId of dirtyTreeIds) {
		const tree = trees.find((entry) => entry.id === treeId);
		if (!tree) {
			await secureIdbDel(treeStorageKey(treeId));
			indexDirty = true;
			continue;
		}
		const stored = await persistTreeRecord(tree);
		updatedRecords.set(tree.id, stored);
		indexDirty = true;
	}

	if (indexDirty) {
		await persistTreeIndexFromTrees(trees, updatedRecords);
	}
}

export async function replaceAllTreesInStorage(trees: Tree[]): Promise<void> {
	await ensureTreeStorageMigrated();

	const version = await getTreeStorageVersion();
	if (version === 0) {
		await secureIdbSet(STORAGE_KEY_LEGACY, toStorable(trees));
		return;
	}

	const existingKeys = await keys();
	const oldTreeKeys = existingKeys.filter(
		(key) => typeof key === 'string' && key.startsWith('yamadori-tree-')
	) as string[];

	const newIds = new Set(trees.map((tree) => tree.id));
	for (const key of oldTreeKeys) {
		const treeId = key.replace(/^yamadori-tree-/, '');
		if (!newIds.has(treeId)) {
			await secureIdbDel(key);
		}
	}

	const updatedRecords = new Map<string, StoredTreeRecord>();
	for (const tree of trees) {
		const stored = await persistTreeRecord(tree);
		updatedRecords.set(tree.id, stored);
	}
	await persistTreeIndexFromTrees(trees, updatedRecords);
}

export { persistTreeRecord } from './persist';
export { mediaRecordToDataUrl } from './codec';
export { isMigrationBlockedError } from '$lib/utils/secure-idb';

