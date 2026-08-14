import { secureIdbDel, secureIdbGet, secureIdbSet } from '$lib/utils/secure-idb';
import { toStorable } from '$lib/utils/idb-store';
import { getTreeMediaHydration, type Tree } from '$lib/types/tree';
import {
	collectAllReferencedMediaIds,
	indexEntryFromTree,
	treeToIndexEntry,
	treeToStoredRecord,
	type MediaExtraction
} from './codec';
import type {
	StoredMediaRecord,
	StoredTreeRecord,
	StoredTreeVisit,
	StoredVoiceNoteRef,
	TreeIndexEntry
} from './types';
import { STORAGE_KEY_INDEX, mediaStorageKey, treeStorageKey } from './types';

async function persistMediaExtractions(extractions: MediaExtraction[]): Promise<void> {
	for (const { mediaId, record } of extractions) {
		await secureIdbSet(mediaStorageKey(mediaId), toStorable(record));
	}
}

/** Keep disk media refs when persisting a partially hydrated in-memory tree. */
export function mergePreservedMediaRefs(
	next: StoredTreeRecord,
	previous: StoredTreeRecord
): StoredTreeRecord {
	const previousByVisitId = new Map(previous.visits.map((visit) => [visit.id, visit]));

	const visits: StoredTreeVisit[] = next.visits.map((visit) => {
		const prior = previousByVisitId.get(visit.id);
		if (!prior) return visit;

		return {
			...visit,
			photoFullIds: [...(prior.photoFullIds ?? [])],
			photoThumbIds: [...(prior.photoThumbIds ?? [])],
			photoFullId: prior.photoFullId,
			photoThumbId: prior.photoThumbId,
			voiceNote: prior.voiceNote
				? ({ ...prior.voiceNote } satisfies StoredVoiceNoteRef)
				: prior.voiceNote === null
					? null
					: visit.voiceNote
		};
	});

	return {
		...next,
		visits,
		voiceNote: previous.voiceNote
			? ({ ...previous.voiceNote } satisfies StoredVoiceNoteRef)
			: previous.voiceNote === null
				? null
				: next.voiceNote
	};
}

export async function persistTreeRecord(tree: Tree): Promise<StoredTreeRecord> {
	const previous = await secureIdbGet<StoredTreeRecord>(treeStorageKey(tree.id));
	const mediaById = new Map<string, StoredMediaRecord>();
	let stored = treeToStoredRecord(tree, mediaById);
	const hydration = getTreeMediaHydration(tree);
	const preserveMedia = hydration !== 'full' && Boolean(previous);

	if (preserveMedia && previous) {
		stored = mergePreservedMediaRefs(stored, previous);
	}

	const extractions: MediaExtraction[] = [...mediaById.entries()].map(([mediaId, record]) => ({
		mediaId,
		record
	}));

	await persistMediaExtractions(extractions);
	await secureIdbSet(treeStorageKey(tree.id), toStorable(stored));

	if (previous && !preserveMedia) {
		const nextIds = new Set(collectAllReferencedMediaIds(stored));
		for (const mediaId of collectAllReferencedMediaIds(previous)) {
			if (!nextIds.has(mediaId)) {
				await secureIdbDel(mediaStorageKey(mediaId));
			}
		}
	}

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
