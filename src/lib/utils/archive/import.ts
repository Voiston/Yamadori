import * as m from '$lib/paraglide/messages.js';
import { unzip } from 'fflate';
import { sha256Hex } from './checksums';
import { base64ToBytes, decryptEnvelope, decryptPayload, isPasswordProtectedArchive } from './crypto';
import { bytesToDataUrl, mimeTypeForExtension } from './media';
import {
	ARCHIVE_FORMAT_VERSION,
	ArchiveError,
	MAX_ARCHIVE_BYTES,
	type ArchiveParseOptions,
	type ArchiveImportPreview,
	type ArchiveManifest,
	type ArchiveProgressCallback,
	type RebuiltArchive,
	type TreeArchive,
	type TreeVisitArchive,
	type VoiceNoteArchive,
	type YamadoriArchiveData,
	type ZipEntryMap
} from './types';
import type { Tree, TreeVisit, VoiceNote } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';

const MANIFEST_PATH = 'manifest.json';
const DONNEES_PATH = 'donnees.enc';

function normalizeZipPath(path: string): string {
	return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function normalizeZipEntries(entries: ZipEntryMap): ZipEntryMap {
	const normalized: ZipEntryMap = {};
	for (const [path, data] of Object.entries(entries)) {
		const key = normalizeZipPath(path);
		normalized[key] = data;
	}
	return normalized;
}

function getZipEntry(entries: ZipEntryMap, path: string): Uint8Array | undefined {
	const normalized = normalizeZipPath(path);
	if (entries[normalized]) return entries[normalized];

	const lower = normalized.toLowerCase();
	for (const [key, data] of Object.entries(entries)) {
		if (normalizeZipPath(key).toLowerCase() === lower) {
			return data;
		}
	}
	return undefined;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
	if (blob.size === 0) {
		throw new ArchiveError('ARCHIVE_INVALID_ZIP', m.archive_empty_file());
	}

	try {
		return new Uint8Array(await blob.arrayBuffer());
	} catch {
		return readBlobBytesWithFileReader(blob);
	}
}

function readBlobBytesWithFileReader(blob: Blob): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (!(reader.result instanceof ArrayBuffer)) {
				reject(new ArchiveError('ARCHIVE_INVALID_ZIP', m.archive_read_failed()));
				return;
			}
			resolve(new Uint8Array(reader.result));
		};
		reader.onerror = () => {
			reject(new ArchiveError('ARCHIVE_INVALID_ZIP', m.archive_read_failed()));
		};
		reader.readAsArrayBuffer(blob);
	});
}

function unzipToMap(data: Uint8Array): Promise<ZipEntryMap> {
	return new Promise((resolve, reject) => {
		unzip(data, (error, result) => {
			if (error) {
				reject(new ArchiveError('ARCHIVE_INVALID_ZIP', m.archive_invalid_zip()));
				return;
			}
			resolve(normalizeZipEntries(result));
		});
	});
}

function parseManifest(bytes: Uint8Array): ArchiveManifest {
	try {
		const manifest = JSON.parse(new TextDecoder().decode(bytes)) as ArchiveManifest;
		if (!manifest || manifest.formatVersion !== ARCHIVE_FORMAT_VERSION) {
			throw new ArchiveError('ARCHIVE_UNSUPPORTED_VERSION', m.archive_unsupported_version());
		}
		if (!manifest.files?.length || !manifest.encryption?.iv) {
			throw new ArchiveError('ARCHIVE_MANIFEST_MISSING', m.archive_invalid_manifest());
		}
		return manifest;
	} catch (error) {
		if (error instanceof ArchiveError) throw error;
		throw new ArchiveError('ARCHIVE_MANIFEST_MISSING', m.archive_invalid_manifest());
	}
}

async function verifyChecksums(manifest: ArchiveManifest, entries: ZipEntryMap): Promise<void> {
	for (const file of manifest.files) {
		const path = normalizeZipPath(file.path);
		const data = getZipEntry(entries, path);
		if (!data) {
			throw new ArchiveError('ARCHIVE_MEDIA_MISSING', m.archive_file_missing({ path }));
		}
		const hash = await sha256Hex(data);
		if (hash !== file.sha256) {
			throw new ArchiveError('ARCHIVE_CHECKSUM_MISMATCH', m.archive_checksum_mismatch({ path }));
		}
	}
}

function loadMediaAsDataUrl(entries: ZipEntryMap, path: string, mimeOverride?: string): string {
	if (!path) return '';
	const data = getZipEntry(entries, path);
	if (!data) {
		throw new ArchiveError('ARCHIVE_MEDIA_MISSING', m.archive_media_missing({ path }));
	}

	const normalizedMime = mimeOverride?.split(';')[0]?.trim().toLowerCase();
	const mimeType =
		normalizedMime ||
		mimeTypeForExtension(normalizeZipPath(path)) ||
		'application/octet-stream';

	return bytesToDataUrl(data, mimeType);
}

function voiceNoteFromArchive(
	entries: ZipEntryMap,
	note: VoiceNoteArchive | null | undefined
): VoiceNote | null {
	if (!note?.mediaPath) return null;

	const audioBase64 = loadMediaAsDataUrl(entries, note.mediaPath, note.mimeType);
	if (!audioBase64) return null;

	return {
		recordedAt: note.recordedAt,
		durationMs: note.durationMs,
		mimeType: note.mimeType,
		audioBase64
	};
}

function visitFromArchive(entries: ZipEntryMap, visit: TreeVisitArchive): TreeVisit {
	return {
		id: visit.id,
		visitedAt: visit.visitedAt,
		note: visit.note,
		photoBase64: loadMediaAsDataUrl(entries, visit.photoPath),
		voiceNote: voiceNoteFromArchive(entries, visit.voiceNote)
	};
}

function treeFromArchive(entries: ZipEntryMap, archive: TreeArchive): Tree {
	return {
		id: archive.id,
		species: archive.species,
		notes: archive.notes,
		photos: archive.photos.map((path) => loadMediaAsDataUrl(entries, path)),
		visits: archive.visits.map((visit) => visitFromArchive(entries, visit)),
		assessment: archive.assessment,
		voiceNote: voiceNoteFromArchive(entries, archive.voiceNote),
		latitude: archive.latitude,
		longitude: archive.longitude,
		accuracyMeters: archive.accuracyMeters,
		altitudeMeters: archive.altitudeMeters,
		frontHeadingDegrees: archive.frontHeadingDegrees,
		isFavorite: archive.isFavorite,
		climateHistory: archive.climateHistory,
		locationLabel: archive.locationLabel,
		cadastreInfo: archive.cadastreInfo ?? null,
		harvestEthicsConfirmation: archive.harvestEthicsConfirmation ?? null,
		environmentExposure: archive.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: archive.yrsAtCapture ?? null,
		capturedAt: archive.capturedAt
	};
}

function collectMediaPaths(data: YamadoriArchiveData): string[] {
	const paths: string[] = [];
	for (const tree of data.trees) {
		for (const photo of tree.photos) {
			if (photo) paths.push(normalizeZipPath(photo));
		}
		if (tree.voiceNote?.mediaPath) paths.push(normalizeZipPath(tree.voiceNote.mediaPath));
		for (const visit of tree.visits) {
			if (visit.photoPath) paths.push(normalizeZipPath(visit.photoPath));
			if (visit.voiceNote?.mediaPath) paths.push(normalizeZipPath(visit.voiceNote.mediaPath));
		}
	}
	return paths;
}

function validatePayload(data: YamadoriArchiveData, entries: ZipEntryMap): void {
	if (data.version !== ARCHIVE_FORMAT_VERSION || !Array.isArray(data.trees)) {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', m.archive_invalid_payload());
	}

	const mediaPaths = collectMediaPaths(data);
	for (const path of mediaPaths) {
		if (!getZipEntry(entries, path)) {
			throw new ArchiveError('ARCHIVE_MEDIA_MISSING', m.archive_media_ref_missing({ path }));
		}
	}
}

export async function isPasswordProtectedBlob(blob: Blob): Promise<boolean> {
	const header = new Uint8Array(await blob.slice(0, 37).arrayBuffer());
	return isPasswordProtectedArchive(header);
}

export async function parseArchive(
	blob: Blob,
	options?: ArchiveParseOptions | ArchiveProgressCallback
): Promise<RebuiltArchive> {
	const { password, onProgress } =
		typeof options === 'function' ? { onProgress: options } : (options ?? {});

	if (blob.size > MAX_ARCHIVE_BYTES) {
		throw new ArchiveError('ARCHIVE_TOO_LARGE', m.archive_too_large());
	}

	onProgress?.('validate', 10);

	const buffer = await readBlobBytes(blob);
	let zipBuffer = buffer;

	if (isPasswordProtectedArchive(buffer)) {
		if (!password) {
			throw new ArchiveError('ARCHIVE_PASSWORD_REQUIRED', m.archive_password_required());
		}
		onProgress?.('decrypt', 5);
		try {
			zipBuffer = await decryptEnvelope(buffer, password);
		} catch (error) {
			if (error instanceof ArchiveError && error.code === 'ARCHIVE_WRONG_PASSWORD') {
				throw new ArchiveError('ARCHIVE_WRONG_PASSWORD', m.archive_wrong_password());
			}
			throw error;
		}
	}

	return parseArchiveZip(zipBuffer, onProgress);
}

async function parseArchiveZip(
	buffer: Uint8Array,
	onProgress?: ArchiveProgressCallback
): Promise<RebuiltArchive> {
	let entries: ZipEntryMap;

	try {
		entries = await unzipToMap(buffer);
	} catch (error) {
		if (error instanceof ArchiveError) throw error;
		throw new ArchiveError('ARCHIVE_INVALID_ZIP', m.archive_invalid_zip());
	}

	const manifestBytes = getZipEntry(entries, MANIFEST_PATH);
	if (!manifestBytes) {
		throw new ArchiveError('ARCHIVE_MANIFEST_MISSING', m.archive_manifest_missing());
	}

	const manifest = parseManifest(manifestBytes);
	onProgress?.('validate', 30);

	await verifyChecksums(manifest, entries);
	onProgress?.('validate', 50);

	const encrypted = getZipEntry(entries, DONNEES_PATH);
	if (!encrypted) {
		throw new ArchiveError('ARCHIVE_MANIFEST_MISSING', m.archive_encrypted_missing());
	}

	onProgress?.('decrypt', 70);

	const plaintext = await decryptPayload(encrypted, base64ToBytes(manifest.encryption.iv));

	let data: YamadoriArchiveData;
	try {
		data = JSON.parse(plaintext) as YamadoriArchiveData;
	} catch {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', m.archive_invalid_payload());
	}

	validatePayload(data, entries);
	onProgress?.('decrypt', 90);

	const trees = data.trees.map((tree) => treeFromArchive(entries, tree));
	const preview: ArchiveImportPreview = {
		treeCount: data.trees.length,
		mediaFileCount: manifest.stats.mediaFileCount,
		exportedAt: manifest.exportedAt,
		appVersion: manifest.appVersion
	};

	onProgress?.('decrypt', 100);

	return {
		trees,
		parking: data.parking,
		appearanceSettings: data.appearanceSettings ?? { outdoorMode: false, darkMode: false, simpleMode: false },
		locationSettings: data.locationSettings ?? { backgroundTrackingEnabled: false },
		preview
	};
}

/** Scan non-encrypted zip text entries for GPS-like patterns (used in tests). */
export function scanEntriesForGpsLeak(entries: ZipEntryMap): string[] {
	const leaks: string[] = [];
	const gpsPattern = /"latitude"\s*:\s*-?\d+\.?\d*|"longitude"\s*:\s*-?\d+\.?\d*/;

	for (const [path, data] of Object.entries(entries)) {
		if (normalizeZipPath(path) === DONNEES_PATH) continue;
		const text = new TextDecoder().decode(data);
		if (gpsPattern.test(text)) {
			leaks.push(path);
		}
	}

	return leaks;
}

export async function readArchiveFile(file: File): Promise<Blob> {
	return file;
}
