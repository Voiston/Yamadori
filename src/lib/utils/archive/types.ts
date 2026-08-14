import type { EnvironmentExposure } from '$lib/types/environment';
import type { ParkingPosition } from '$lib/types/parking';
import type { CadastreInfo } from '$lib/types/cadastre';
import type { HarvestEthicsConfirmation } from '$lib/types/harvest-ethics';
import type { Tree, TreeAssessment, VoiceNote } from '$lib/types/tree';
import type { ClimateHistory } from '$lib/types/climate';

import type { StoredApiSettings } from '$lib/stores/apiSettings.svelte';

export const ARCHIVE_FORMAT_VERSION = 2;
export const MAX_ARCHIVE_BYTES = 500 * 1024 * 1024;
export const MAX_DECOMPRESSED_BYTES = 1024 * 1024 * 1024;
export const MAX_LEGACY_BACKUP_BYTES = 50 * 1024 * 1024;
export const ARCHIVE_MANIFEST_PATH = 'manifest.json';
export const ARCHIVE_DONNEES_JSON_PATH = 'donnees.json';
export const ARCHIVE_DONNEES_ENC_PATH = 'donnees.enc';

export type ArchiveErrorCode =
	| 'ARCHIVE_INVALID_ZIP'
	| 'ARCHIVE_MANIFEST_MISSING'
	| 'ARCHIVE_CHECKSUM_MISMATCH'
	| 'ARCHIVE_UNSUPPORTED_VERSION'
	| 'ARCHIVE_MEDIA_MISSING'
	| 'ARCHIVE_TOO_LARGE'
	| 'ARCHIVE_INVALID_PAYLOAD'
	| 'ARCHIVE_PASSWORD_REQUIRED'
	| 'ARCHIVE_WRONG_PASSWORD';

export class ArchiveError extends Error {
	constructor(
		public readonly code: ArchiveErrorCode,
		message: string
	) {
		super(message);
		this.name = 'ArchiveError';
	}
}

export type ArchiveFileEntry = {
	path: string;
	sha256: string;
	size: number;
};

/** Inner-zip payload encryption. `null` = honest plaintext (`donnees.json`). */
export type ArchiveManifestEncryption = {
	algorithm: 'AES-256-GCM';
	keyScope?: 'app' | 'archive';
	/** Base64-encoded 256-bit key when keyScope is archive (legacy unprotected). */
	keyMaterial?: string;
	iv: string;
	/** @deprecated Ancien format chiffré par mot de passe */
	salt?: string;
	kdf?: string;
};

export type ArchiveManifest = {
	formatVersion: number;
	appVersion: string;
	exportedAt: string;
	/** `null` for plaintext exports; object for legacy inner AES (`donnees.enc`). */
	encryption: ArchiveManifestEncryption | null;
	stats: {
		treeCount: number;
		mediaFileCount: number;
	};
	files: ArchiveFileEntry[];
};

export type VoiceNoteArchive = {
	recordedAt: string;
	durationMs: number;
	mimeType: string;
	mediaPath: string;
};

export type TreeVisitArchive = {
	id: string;
	visitedAt: string;
	note: string;
	/** Preferred multi-photo paths (max 3). */
	photoPaths?: string[];
	/** @deprecated Legacy single photo path. */
	photoPath?: string;
	voiceNote?: VoiceNoteArchive | null;
	yrsSnapshot?: import('$lib/types/yrs').YrsStoredSnapshot | null;
};

export type TreeArchive = {
	id: string;
	species: string;
	notes: string;
	photos: string[];
	visits: TreeVisitArchive[];
	assessment: TreeAssessment;
	voiceNote: VoiceNoteArchive | null;
	latitude: number | null;
	longitude: number | null;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
	frontHeadingDegrees: number | null;
	isFavorite: boolean;
	climateHistory: ClimateHistory | null;
	locationLabel: string | null;
	cadastreInfo?: CadastreInfo | null;
	harvestEthicsConfirmation?: HarvestEthicsConfirmation | null;
	environmentExposure: EnvironmentExposure;
	yrsAtCapture?: import('$lib/types/yrs').YrsStoredSnapshot | null;
	capturedAt: string;
};

export type YamadoriArchiveData = {
	version: typeof ARCHIVE_FORMAT_VERSION;
	trees: TreeArchive[];
	parking: ParkingPosition | null;
	appearanceSettings: { outdoorMode: boolean; darkMode?: boolean; simpleMode?: boolean; locale?: import('$lib/stores/appearanceSettings.svelte').AppLocale };
	apiSettings?: StoredApiSettings;
};

export type ArchiveExportInput = {
	trees: Tree[];
	parking: ParkingPosition | null;
	appearanceSettings: { outdoorMode: boolean; darkMode?: boolean; simpleMode?: boolean; locale?: import('$lib/stores/appearanceSettings.svelte').AppLocale };
	apiSettings?: StoredApiSettings;
	appVersion: string;
};

export type ArchiveBuildOptions = {
	password?: string;
	onProgress?: ArchiveProgressCallback;
};

export type ArchiveParseOptions = {
	password?: string;
	onProgress?: ArchiveProgressCallback;
};

export type ArchiveImportPreview = {
	treeCount: number;
	mediaFileCount: number;
	exportedAt: string;
	appVersion: string;
};

export type ArchiveProgressPhase = 'media' | 'encrypt' | 'zip' | 'validate' | 'decrypt';

export type ArchiveProgressCallback = (phase: ArchiveProgressPhase, percent: number) => void;

export type ZipEntryMap = Record<string, Uint8Array>;

/** Internal type for rebuilding trees after import. */
export type RebuiltArchive = {
	trees: Tree[];
	parking: ParkingPosition | null;
	appearanceSettings: YamadoriArchiveData['appearanceSettings'];
	apiSettings?: StoredApiSettings;
	preview: ArchiveImportPreview;
};

export function voiceNoteToArchive(note: VoiceNote, mediaPath: string): VoiceNoteArchive {
	return {
		recordedAt: note.recordedAt,
		durationMs: note.durationMs,
		mimeType: note.mimeType,
		mediaPath
	};
}
