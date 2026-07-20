import type { Tree, TreeVisit, VoiceNote } from '$lib/types/tree';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
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
		const full = extractMediaFromDataUrl(visit.photoBase64, 'full');
		const thumbSource = visit.photoThumbBase64 ?? visit.photoBase64;
		const thumb = extractMediaFromDataUrl(thumbSource, 'thumb');

		const photoFullId = full?.mediaId ?? '';
		const photoThumbId = thumb?.mediaId ?? photoFullId;

		if (full) mediaById.set(full.mediaId, full.record);
		if (thumb && thumb.mediaId !== photoFullId) {
			mediaById.set(thumb.mediaId, thumb.record);
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
			photoFullId,
			photoThumbId,
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
		version: 1,
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
	return {
		id: stored.id,
		species: stored.species,
		capturedAt: stored.capturedAt,
		isFavorite: stored.isFavorite,
		latitude: stored.latitude,
		longitude: stored.longitude,
		coverThumbId: coverVisit?.photoThumbId || coverVisit?.photoFullId || null
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

function visitFromStored(
	visit: StoredTreeVisit,
	mediaById: Map<string, StoredMediaRecord>,
	level: import('./types').TreeHydrationLevel
): TreeVisit {
	const fullRecord = visit.photoFullId ? mediaById.get(visit.photoFullId) : undefined;
	const thumbRecord = visit.photoThumbId ? mediaById.get(visit.photoThumbId) : undefined;

	const photoBase64 =
		level === 'full' && fullRecord ? mediaRecordToDataUrl(fullRecord) : '';
	const photoThumbBase64 =
		level !== 'index' && thumbRecord ? mediaRecordToDataUrl(thumbRecord) : undefined;

	return {
		id: visit.id,
		visitedAt: visit.visitedAt,
		note: visit.note,
		photoBase64,
		photoThumbBase64,
		voiceNote: level === 'full' ? resolveVoiceNote(visit.voiceNote, mediaById) : null,
		yrsSnapshot: visit.yrsSnapshot ?? null
	};
}

function collectPhotosFromVisits(visits: TreeVisit[]): string[] {
	const photos: string[] = [];
	for (const visit of visits) {
		if (visit.photoBase64 && !photos.includes(visit.photoBase64)) {
			photos.push(visit.photoBase64);
		}
	}
	return photos;
}

function collectThumbsFromVisits(visits: TreeVisit[]): string[] {
	const thumbs: string[] = [];
	for (const visit of visits) {
		const thumb = visit.photoThumbBase64 ?? visit.photoBase64;
		if (thumb && !thumbs.includes(thumb)) {
			thumbs.push(thumb);
		}
	}
	return thumbs;
}

export function storedRecordToTree(
	stored: StoredTreeRecord,
	mediaById: Map<string, StoredMediaRecord>,
	level: import('./types').TreeHydrationLevel
): Tree {
	const visits = stored.visits.map((visit) => visitFromStored(visit, mediaById, level));
	const photos = level === 'full' ? collectPhotosFromVisits(visits) : [];
	const photoThumbs = level !== 'index' ? collectThumbsFromVisits(visits) : [];

	return {
		id: stored.id,
		species: stored.species,
		notes: stored.notes,
		photos,
		photoThumbs: photoThumbs.length > 0 ? photoThumbs : undefined,
		visits,
		assessment: { ...DEFAULT_ASSESSMENT, ...stored.assessment },
		voiceNote: level === 'full' ? resolveVoiceNote(stored.voiceNote, mediaById) : null,
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
		capturedAt: stored.capturedAt
	};
}

export function collectMediaIdsForTree(
	stored: StoredTreeRecord,
	level: import('./types').TreeHydrationLevel
): string[] {
	const ids = new Set<string>();

	for (const visit of stored.visits) {
		if (level === 'full') {
			if (visit.photoFullId) ids.add(visit.photoFullId);
			if (visit.voiceNote?.mediaId) ids.add(visit.voiceNote.mediaId);
		} else if (visit.photoThumbId) {
			ids.add(visit.photoThumbId);
		} else if (visit.photoFullId) {
			ids.add(visit.photoFullId);
		}
	}

	if (level === 'full' && stored.voiceNote?.mediaId) {
		ids.add(stored.voiceNote.mediaId);
	}

	return [...ids];
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
