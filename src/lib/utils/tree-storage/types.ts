import type { YrsStoredSnapshot } from '$lib/types/yrs';

export const TREE_STORAGE_VERSION = 2;

export const STORAGE_KEY_LEGACY = 'yamadori-trees';
export const STORAGE_KEY_VERSION = 'yamadori-trees-storage-version';
export const STORAGE_KEY_INDEX = 'yamadori-trees-index';
export const STORAGE_KEY_V0_BACKUP = 'yamadori-trees-v0-backup';
export const STORAGE_KEY_TREE_PREFIX = 'yamadori-tree-';
export const STORAGE_KEY_MEDIA_PREFIX = 'yamadori-media-';

export const TREE_STORAGE_SENSITIVE_KEYS = [
	STORAGE_KEY_VERSION,
	STORAGE_KEY_INDEX,
	STORAGE_KEY_V0_BACKUP
] as const;

export const TREE_STORAGE_SENSITIVE_PREFIXES = [
	STORAGE_KEY_TREE_PREFIX,
	STORAGE_KEY_MEDIA_PREFIX
] as const;

export type MediaKind = 'full' | 'thumb' | 'audio';

export type StoredMediaRecord = {
	mimeType: string;
	kind: MediaKind;
	data: Uint8Array;
};

export type StoredVoiceNoteRef = {
	mediaId: string;
	recordedAt: string;
	durationMs: number;
	mimeType: string;
};

export type StoredTreeVisit = {
	id: string;
	visitedAt: string;
	note: string;
	photoFullIds: string[];
	photoThumbIds: string[];
	/** @deprecated Legacy single-photo fields; read via normalizeStoredVisitPhotoIds. */
	photoFullId?: string;
	/** @deprecated Legacy single-photo fields; read via normalizeStoredVisitPhotoIds. */
	photoThumbId?: string;
	voiceNote?: StoredVoiceNoteRef | null;
	yrsSnapshot?: YrsStoredSnapshot | null;
};

export function normalizeStoredVisitPhotoIds(visit: StoredTreeVisit): {
	photoFullIds: string[];
	photoThumbIds: string[];
} {
	if (visit.photoFullIds && visit.photoFullIds.length > 0) {
		const photoFullIds = visit.photoFullIds.filter(Boolean);
		const photoThumbIds =
			visit.photoThumbIds && visit.photoThumbIds.length > 0
				? visit.photoThumbIds.filter(Boolean)
				: photoFullIds;
		return { photoFullIds, photoThumbIds };
	}

	const fullId = visit.photoFullId ?? '';
	const thumbId = visit.photoThumbId ?? fullId;
	return {
		photoFullIds: fullId ? [fullId] : [],
		photoThumbIds: thumbId ? [thumbId] : []
	};
}

export type StoredTreeRecord = {
	version: number;
	id: string;
	species: string;
	notes: string;
	visits: StoredTreeVisit[];
	assessment: import('$lib/types/tree').TreeAssessment;
	voiceNote?: StoredVoiceNoteRef | null;
	latitude: number | null;
	longitude: number | null;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
	frontHeadingDegrees: number | null;
	isFavorite: boolean;
	climateHistory: import('$lib/types/climate').ClimateHistory | null;
	locationLabel: string | null;
	cadastreInfo: import('$lib/types/cadastre').CadastreInfo | null;
	harvestEthicsConfirmation: import('$lib/types/harvest-ethics').HarvestEthicsConfirmation | null;
	environmentExposure: import('$lib/types/environment').EnvironmentExposure;
	yrsAtCapture: YrsStoredSnapshot | null;
	capturedAt: string;
};

export type TreeIndexEntry = {
	id: string;
	species: string;
	capturedAt: string;
	isFavorite: boolean;
	latitude: number | null;
	longitude: number | null;
	coverThumbId: string | null;
};

export type TreeStorageMigrationProgress = {
	percent: number;
	phase: 'read' | 'media' | 'trees' | 'finalize';
	currentTreeId?: string;
};

export type TreeStorageMigrationCallback = (
	progress: TreeStorageMigrationProgress
) => void | Promise<void>;

export type TreeHydrationLevel = 'index' | 'thumbs' | 'full';

export function treeStorageKey(treeId: string): string {
	return `${STORAGE_KEY_TREE_PREFIX}${treeId}`;
}

export function mediaStorageKey(mediaId: string): string {
	return `${STORAGE_KEY_MEDIA_PREFIX}${mediaId}`;
}

export function isTreeStorageKey(key: string): boolean {
	return key.startsWith(STORAGE_KEY_TREE_PREFIX) || key.startsWith(STORAGE_KEY_MEDIA_PREFIX);
}
