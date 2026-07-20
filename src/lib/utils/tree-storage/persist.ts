import { secureIdbGet, secureIdbSet } from '$lib/utils/secure-idb';
import { toStorable } from '$lib/utils/idb-store';
import type { Tree } from '$lib/types/tree';
import {
	indexEntryFromTree,
	treeToIndexEntry,
	treeToStoredRecord,
	type MediaExtraction
} from './codec';
import type { StoredMediaRecord, StoredTreeRecord, TreeIndexEntry } from './types';
import { STORAGE_KEY_INDEX, mediaStorageKey, treeStorageKey } from './types';

async function persistMediaExtractions(extractions: MediaExtraction[]): Promise<void> {
	for (const { mediaId, record } of extractions) {
		await secureIdbSet(mediaStorageKey(mediaId), toStorable(record));
	}
}

export async function persistTreeRecord(tree: Tree): Promise<StoredTreeRecord> {
	const mediaById = new Map<string, StoredMediaRecord>();
	const stored = treeToStoredRecord(tree, mediaById);

	const extractions: MediaExtraction[] = [...mediaById.entries()].map(([mediaId, record]) => ({
		mediaId,
		record
	}));

	await persistMediaExtractions(extractions);
	await secureIdbSet(treeStorageKey(tree.id), toStorable(stored));
	return stored;
}

export async function persistTreeIndexFromTrees(
	trees: Tree[],
	updatedRecords?: Map<string, StoredTreeRecord>
): Promise<void> {
	const priorIndexById =
		updatedRecords && updatedRecords.size < trees.length
			? new Map(
					((await secureIdbGet<TreeIndexEntry[]>(STORAGE_KEY_INDEX)) ?? []).map((entry) => [
						entry.id,
						entry
					])
				)
			: null;

	const index: TreeIndexEntry[] = [];
	for (const tree of trees) {
		const stored = updatedRecords?.get(tree.id);
		if (stored) {
			index.push(treeToIndexEntry(stored));
			continue;
		}

		const prior = priorIndexById?.get(tree.id);
		if (prior) {
			index.push(prior);
			continue;
		}

		index.push(indexEntryFromTree(tree));
	}

	await secureIdbSet(STORAGE_KEY_INDEX, toStorable(index));
}
