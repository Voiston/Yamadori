import type { Tree, TreeVisit, VoiceNote, LegacyTreeVisitFields } from '$lib/types/tree';
import {
	DEFAULT_ASSESSMENT,
	collectPhotosFromVisits,
	collectThumbsFromVisits,
	normalizeVisitPhotoFields
} from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { normalizeDeadwood } from '$lib/constants/assessment';
import { generateId } from '$lib/utils/id';
import { parseDataUrl, bytesToDataUrl } from '$lib/utils/archive/media';
import type {
	MediaKind,
	StoredMediaRecord,
	StoredTreeRecord,
	StoredTreeVisit,
	StoredVoiceNoteRef,
	TreeIndexEntry
} from './types';
import { normalizeStoredVisitPhotoIds, TREE_STORAGE_VERSION } from './types';

export function dataUrlToMediaRecord(
	dataUrl: string,
	kind: MediaKind
): StoredMediaRecord | null {
	if (!dataUrl.trim()) return null;
	const parsed = parseDataUrl(dataUrl);
	if (!parsed || parsed.bytes.length === 0) return null;
	return {
		mimeType: parsed.mimeType,
		kind,
		data: parsed.bytes
	};
}

function normalizeMediaBytes(data: Uint8Array | number[] | Record<string, number>): Uint8Array {
	if (data instanceof Uint8Array) return data;
	if (Array.isArray(data)) return new Uint8Array(data);
	const values = Object.keys(data)
		.filter((key) => /^\d+$/.test(key))
		.sort((a, b) => Number(a) - Number(b))
		.map((key) => data[key]!);
	return new Uint8Array(values);
}

export function normalizeStoredMediaRecord(record: StoredMediaRecord): StoredMediaRecord {
	return {
		...record,
		data: normalizeMediaBytes(record.data as Uint8Array | number[] | Record<string, number>)
	};
}

export function mediaRecordToDataUrl(record: StoredMediaRecord): string {
	const normalized = normalizeStoredMediaRecord(record);
	return bytesToDataUrl(normalized.data, normalized.mimeType);
}

function voiceNoteToRef(note: VoiceNote, mediaId: string): StoredVoiceNoteRef {
	return {
		mediaId,
		recordedAt: note.recordedAt,
		durationMs: note.durationMs,
		mimeType: note.mimeType
	};
}

export type MediaExtraction = {
	mediaId: string;
	record: StoredMediaRecord;
};

export function extractMediaFromDataUrl(
	dataUrl: string,
	kind: MediaKind,
	mediaId = generateId()
): MediaExtraction | null {
	const record = dataUrlToMediaRecord(dataUrl, kind);
	if (!record) return null;
	return { mediaId, record };
}

export function treeToStoredRecord(
	tree: Tree,
	mediaById: Map<string, StoredMediaRecord>
): StoredTreeRecord {
	const visits: StoredTreeVisit[] = tree.visits.map((visit) => {
		const photoFullIds: string[] = [];
		const photoThumbIds: string[] = [];

		for (let i = 0; i < visit.photos.length; i += 1) {
			const fullData = visit.photos[i] ?? '';
			const thumbData = visit.photoThumbs?.[i] ?? fullData;
			const full = extractMediaFromDataUrl(fullData, 'full');
			const thumb = extractMediaFromDataUrl(thumbData, 'thumb');
			const photoFullId = full?.mediaId ?? '';
			const photoThumbId = thumb?.mediaId ?? photoFullId;

			if (full) mediaById.set(full.mediaId, full.record);
			if (thumb && thumb.mediaId !== photoFullId) {
				mediaById.set(thumb.mediaId, thumb.record);
			}

			if (photoFullId) {
				photoFullIds.push(photoFullId);
				photoThumbIds.push(photoThumbId || photoFullId);
			}
		}

		let voiceNote: StoredVoiceNoteRef | null = null;
		if (visit.voiceNote?.audioBase64) {
			const audio = extractMediaFromDataUrl(visit.voiceNote.audioBase64, 'audio');
			if (audio) {
				mediaById.set(audio.mediaId, audio.record);
				voiceNote = voiceNoteToRef(visit.voiceNote, audio.mediaId);
			}
		}

		return {
			id: visit.id,
			visitedAt: visit.visitedAt,
			note: visit.note,
			photoFullIds,
			photoThumbIds,
			voiceNote,
			yrsSnapshot: visit.yrsSnapshot ?? null
		};
	});

	let treeVoiceNote: StoredVoiceNoteRef | null = null;
	if (tree.voiceNote?.audioBase64) {
		const audio = extractMediaFromDataUrl(tree.voiceNote.audioBase64, 'audio');
		if (audio) {
			mediaById.set(audio.mediaId, audio.record);
			treeVoiceNote = voiceNoteToRef(tree.voiceNote, audio.mediaId);
		}
	}

	return {
		version: TREE_STORAGE_VERSION,
		id: tree.id,
		species: tree.species,
		notes: tree.notes,
		visits,
		assessment: tree.assessment,
		voiceNote: treeVoiceNote,
		latitude: tree.latitude,
		longitude: tree.longitude,
		accuracyMeters: tree.accuracyMeters,
		altitudeMeters: tree.altitudeMeters,
		frontHeadingDegrees: tree.frontHeadingDegrees,
		isFavorite: tree.isFavorite,
		climateHistory: tree.climateHistory,
		locationLabel: tree.locationLabel,
		cadastreInfo: tree.cadastreInfo,
		harvestEthicsConfirmation: tree.harvestEthicsConfirmation,
		environmentExposure: tree.environmentExposure,
		yrsAtCapture: tree.yrsAtCapture,
		capturedAt: tree.capturedAt
	};
}

export function treeToIndexEntry(stored: StoredTreeRecord): TreeIndexEntry {
	const coverVisit = stored.visits[0];
	const { photoFullIds, photoThumbIds } = coverVisit
		? normalizeStoredVisitPhotoIds(coverVisit)
		: { photoFullIds: [] as string[], photoThumbIds: [] as string[] };
	return {
		id: stored.id,
		species: stored.species,
		capturedAt: stored.capturedAt,
		isFavorite: stored.isFavorite,
		latitude: stored.latitude,
		longitude: stored.longitude,
		coverThumbId: photoThumbIds[0] || photoFullIds[0] || null
	};
}

export function indexEntryFromTree(tree: Tree): TreeIndexEntry {
	const mediaById = new Map<string, StoredMediaRecord>();
	return treeToIndexEntry(treeToStoredRecord(tree, mediaById));
}

function resolveVoiceNote(
	ref: StoredVoiceNoteRef | null | undefined,
	mediaById: Map<string, StoredMediaRecord>
): VoiceNote | null {
	if (!ref) return null;
	const record = mediaById.get(ref.mediaId);
	if (!record) return null;
	return {
		recordedAt: ref.recordedAt,
		durationMs: ref.durationMs,
		mimeType: ref.mimeType,
		audioBase64: mediaRecordToDataUrl(record)
	};
}

/** Metadata-only voice note for list/thumbs hydration (no audio payload). */
function resolveVoiceNotePresence(ref: StoredVoiceNoteRef | null | undefined): VoiceNote | null {
	if (!ref) return null;
	return {
		recordedAt: ref.recordedAt,
		durationMs: ref.durationMs,
		mimeType: ref.mimeType,
		audioBase64: ''
	};
}

function visitFromStored(
	visit: StoredTreeVisit,
	mediaById: Map<string, StoredMediaRecord>,
	level: import('./types').TreeHydrationLevel
): TreeVisit {
	const { photoFullIds, photoThumbIds } = normalizeStoredVisitPhotoIds(visit);
	const photos: string[] = [];
	const photoThumbs: string[] = [];

	for (let i = 0; i < photoFullIds.length; i += 1) {
		const fullId = photoFullIds[i]!;
		const thumbId = photoThumbIds[i] ?? fullId;
		const fullRecord = mediaById.get(fullId);
		const thumbRecord = mediaById.get(thumbId);

		if (level === 'full') {
			photos.push(fullRecord ? mediaRecordToDataUrl(fullRecord) : '');
		}

		if (level !== 'index') {
			if (thumbRecord) {
				photoThumbs.push(mediaRecordToDataUrl(thumbRecord));
			} else if (level === 'full' && fullRecord) {
				photoThumbs.push(mediaRecordToDataUrl(fullRecord));
			}
		}
	}

	if (level === 'thumbs') {
		while (photos.length < photoThumbs.length) {
			photos.push('');
		}
	}

	return {
		id: visit.id,
		visitedAt: visit.visitedAt,
		note: visit.note,
		photos,
		photoThumbs: photoThumbs.length > 0 ? photoThumbs : undefined,
		voiceNote: level === 'full' ? resolveVoiceNote(visit.voiceNote, mediaById) : null,
		yrsSnapshot: visit.yrsSnapshot ?? null
	};
}

export function storedRecordToTree(
	stored: StoredTreeRecord,
	mediaById: Map<string, StoredMediaRecord>,
	level: import('./types').TreeHydrationLevel
): Tree {
	const visits = stored.visits.map((visit) => visitFromStored(visit, mediaById, level));
	const photos = level === 'full' ? collectPhotosFromVisits(visits) : [];
	const photoThumbs = level !== 'index' ? collectThumbsFromVisits(visits) : undefined;

	return {
		id: stored.id,
		species: stored.species,
		notes: stored.notes,
		photos,
		photoThumbs,
		visits,
		assessment: {
			...DEFAULT_ASSESSMENT,
			...stored.assessment,
			deadwood: normalizeDeadwood(
				(stored.assessment as { deadwood?: unknown } | undefined)?.deadwood
			)
		},
		voiceNote:
			level === 'full'
				? resolveVoiceNote(stored.voiceNote, mediaById)
				: resolveVoiceNotePresence(stored.voiceNote),
		latitude: stored.latitude,
		longitude: stored.longitude,
		accuracyMeters: stored.accuracyMeters,
		altitudeMeters: stored.altitudeMeters,
		frontHeadingDegrees: stored.frontHeadingDegrees,
		isFavorite: stored.isFavorite,
		climateHistory: stored.climateHistory,
		locationLabel: stored.locationLabel,
		cadastreInfo: stored.cadastreInfo,
		harvestEthicsConfirmation: stored.harvestEthicsConfirmation,
		environmentExposure: stored.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: stored.yrsAtCapture,
		capturedAt: stored.capturedAt,
		mediaHydration: level
	};
}

export function collectMediaIdsForVisit(
	visit: StoredTreeVisit,
	level: import('./types').TreeHydrationLevel
): string[] {
	const { photoFullIds, photoThumbIds } = normalizeStoredVisitPhotoIds(visit);
	const ids = new Set<string>();

	if (level === 'full') {
		for (const id of photoFullIds) {
			if (id) ids.add(id);
		}
		for (const id of photoThumbIds) {
			if (id) ids.add(id);
		}
		if (visit.voiceNote?.mediaId) ids.add(visit.voiceNote.mediaId);
	} else {
		for (let i = 0; i < Math.max(photoFullIds.length, photoThumbIds.length); i += 1) {
			const thumbId = photoThumbIds[i];
			const fullId = photoFullIds[i];
			if (thumbId) ids.add(thumbId);
			else if (fullId) ids.add(fullId);
		}
	}

	return [...ids];
}

export function collectMediaIdsForTree(
	stored: StoredTreeRecord,
	level: import('./types').TreeHydrationLevel
): string[] {
	const ids = new Set<string>();

	for (const visit of stored.visits) {
		for (const id of collectMediaIdsForVisit(visit, level)) {
			ids.add(id);
		}
	}

	if (level === 'full' && stored.voiceNote?.mediaId) {
		ids.add(stored.voiceNote.mediaId);
	}

	return [...ids];
}

/** All media ids referenced by a stored tree (full + thumb + audio). */
export function collectAllReferencedMediaIds(stored: StoredTreeRecord): string[] {
	return collectMediaIdsForTree(stored, 'full');
}

export function collectMediaIdsForTrees(
	records: StoredTreeRecord[],
	level: import('./types').TreeHydrationLevel
): string[] {
	const ids = new Set<string>();
	for (const record of records) {
		for (const id of collectMediaIdsForTree(record, level)) {
			ids.add(id);
		}
	}
	return [...ids];
}

export function collectOrphanMediaIds(
	index: TreeIndexEntry[],
	allTreeIds: Set<string>,
	allMediaKeys: string[]
): string[] {
	const referenced = new Set<string>();
	for (const entry of index) {
		if (entry.coverThumbId) referenced.add(entry.coverThumbId);
	}

	const orphans: string[] = [];
	for (const key of allMediaKeys) {
		const mediaId = key.replace(/^yamadori-media-/, '');
		if (!referenced.has(mediaId)) {
			// Referenced media is validated per-tree during persist; orphans cleaned separately.
			void allTreeIds;
		}
	}
	return orphans;
}

export function normalizeRuntimeVisit(
	raw: Partial<TreeVisit> & LegacyTreeVisitFields & { id: string; visitedAt: string }
): TreeVisit {
	const { photos, photoThumbs } = normalizeVisitPhotoFields(raw);
	return {
		id: raw.id,
		visitedAt: raw.visitedAt,
		note: raw.note ?? '',
		photos,
		photoThumbs,
		voiceNote: raw.voiceNote ?? null,
		yrsSnapshot: raw.yrsSnapshot ?? null
	};
}
