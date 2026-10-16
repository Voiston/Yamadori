import * as v from 'valibot';
import * as m from '$lib/paraglide/messages.js';
import type { Tree, VoiceNote } from '$lib/types/tree';
import type { ParkingPosition } from '$lib/types/parking';
import { MAX_LEGACY_BACKUP_BYTES, ArchiveError } from './types';
import { sanitizeAudioDataUrl, sanitizeImageDataUrl } from './media';

export const LEGACY_BACKUP_VERSION = 1;
export const MAX_LEGACY_TREES = 200;
const MAX_STRING = 10_000;
const MAX_SHORT = 256;

export type YamadoriLegacyBackup = {
	version: number;
	exportedAt: string;
	trees: Tree[];
	parking: ParkingPosition | null;
};

const legacyTreeSchema = v.record(v.string(), v.unknown());

const legacyBackupSchema = v.object({
	version: v.literal(LEGACY_BACKUP_VERSION),
	exportedAt: v.optional(v.string()),
	trees: v.pipe(v.array(legacyTreeSchema), v.maxLength(MAX_LEGACY_TREES)),
	parking: v.optional(v.nullable(v.unknown()))
});

function boundString(value: unknown, max: number): unknown {
	if (typeof value !== 'string') return value;
	return value.length > max ? value.slice(0, max) : value;
}

function boundCoord(value: unknown, min: number, max: number): unknown {
	if (typeof value !== 'number' || !Number.isFinite(value)) return value;
	if (value < min || value > max) return null;
	return value;
}

function sanitizePhotoList(photos: unknown): string[] {
	if (!Array.isArray(photos)) return [];
	return photos
		.filter((photo): photo is string => typeof photo === 'string')
		.map(sanitizeImageDataUrl)
		.filter(Boolean);
}

function sanitizeVoiceNote(raw: unknown): VoiceNote | null {
	if (!raw || typeof raw !== 'object') return null;
	const note = raw as Record<string, unknown>;
	const audioRaw = typeof note.audioBase64 === 'string' ? note.audioBase64 : '';
	const mimeType = typeof note.mimeType === 'string' ? note.mimeType : undefined;
	const audioBase64 = sanitizeAudioDataUrl(audioRaw, mimeType);
	if (!audioBase64) return null;
	return {
		recordedAt: typeof note.recordedAt === 'string' ? note.recordedAt : '',
		durationMs: typeof note.durationMs === 'number' ? note.durationMs : 0,
		mimeType: mimeType ?? 'audio/aac',
		audioBase64
	};
}

function sanitizeLegacyVisit(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== 'object') return {};
	const visit = { ...(raw as Record<string, unknown>) };
	if (visit.note !== undefined) visit.note = boundString(visit.note, MAX_STRING);
	if (visit.visitedAt !== undefined) visit.visitedAt = boundString(visit.visitedAt, MAX_SHORT);
	if (visit.id !== undefined) visit.id = boundString(visit.id, 128);
	if (visit.photos !== undefined) {
		visit.photos = sanitizePhotoList(visit.photos);
	}
	if (visit.photoThumbs !== undefined) {
		visit.photoThumbs = sanitizePhotoList(visit.photoThumbs);
	}
	if (typeof visit.photoBase64 === 'string') {
		visit.photoBase64 = sanitizeImageDataUrl(visit.photoBase64);
	}
	if (visit.voiceNote !== undefined) {
		visit.voiceNote = sanitizeVoiceNote(visit.voiceNote);
	}
	return visit;
}

function sanitizeLegacyTree(raw: Record<string, unknown>): Tree {
	const tree = { ...raw };
	if (tree.species !== undefined) tree.species = boundString(tree.species, MAX_SHORT);
	if (tree.notes !== undefined) tree.notes = boundString(tree.notes, MAX_STRING);
	if (tree.locationLabel !== undefined) tree.locationLabel = boundString(tree.locationLabel, MAX_SHORT);
	if (tree.capturedAt !== undefined) tree.capturedAt = boundString(tree.capturedAt, MAX_SHORT);
	if (tree.latitude !== undefined) tree.latitude = boundCoord(tree.latitude, -90, 90);
	if (tree.longitude !== undefined) tree.longitude = boundCoord(tree.longitude, -180, 180);
	if (tree.photos !== undefined) {
		tree.photos = sanitizePhotoList(tree.photos);
	}
	if (tree.photoThumbs !== undefined) {
		tree.photoThumbs = sanitizePhotoList(tree.photoThumbs);
	}
	if (typeof tree.photoBase64 === 'string') {
		tree.photoBase64 = sanitizeImageDataUrl(tree.photoBase64);
	}
	if (typeof tree.photoThumbBase64 === 'string') {
		tree.photoThumbBase64 = sanitizeImageDataUrl(tree.photoThumbBase64);
	}
	if (Array.isArray(tree.visits)) {
		tree.visits = tree.visits.map(sanitizeLegacyVisit);
	}
	if (tree.voiceNote !== undefined) {
		tree.voiceNote = sanitizeVoiceNote(tree.voiceNote);
	}
	return tree as unknown as Tree;
}

export function parseLegacyBackup(raw: string, byteLength?: number): YamadoriLegacyBackup {
	if (byteLength !== undefined && byteLength > MAX_LEGACY_BACKUP_BYTES) {
		throw new ArchiveError('ARCHIVE_TOO_LARGE', m.archive_too_large());
	}
	if (raw.length > MAX_LEGACY_BACKUP_BYTES) {
		throw new ArchiveError('ARCHIVE_TOO_LARGE', m.archive_too_large());
	}

	const parsed: unknown = JSON.parse(raw);
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		(parsed as { version?: unknown }).version !== LEGACY_BACKUP_VERSION ||
		!Array.isArray((parsed as { trees?: unknown }).trees)
	) {
		throw new ArchiveError('ARCHIVE_UNSUPPORTED_VERSION', m.archive_unsupported_version());
	}

	const trees = (parsed as { trees: unknown[] }).trees;
	if (trees.length > MAX_LEGACY_TREES) {
		throw new ArchiveError(
			'ARCHIVE_TOO_LARGE',
			m.archive_too_many_trees({ max: String(MAX_LEGACY_TREES) })
		);
	}

	const result = v.safeParse(legacyBackupSchema, parsed);
	if (!result.success) {
		throw new ArchiveError('ARCHIVE_INVALID_PAYLOAD', m.archive_invalid_payload());
	}

	let parking: ParkingPosition | null =
		(result.output.parking as ParkingPosition | null | undefined) ?? null;
	if (parking && typeof parking === 'object') {
		const latitude = boundCoord(parking.latitude, -90, 90);
		const longitude = boundCoord(parking.longitude, -180, 180);
		parking =
			typeof latitude === 'number' && typeof longitude === 'number'
				? { ...parking, latitude, longitude }
				: null;
	}

	return {
		version: result.output.version,
		exportedAt: result.output.exportedAt ?? new Date().toISOString(),
		trees: result.output.trees.map(sanitizeLegacyTree),
		parking
	};
}

export async function readLegacyBackupFile(file: File): Promise<YamadoriLegacyBackup> {
	if (file.size > MAX_LEGACY_BACKUP_BYTES) {
		throw new ArchiveError('ARCHIVE_TOO_LARGE', m.archive_too_large());
	}
	const raw = await file.text();
	return parseLegacyBackup(raw, file.size);
}

export function isLegacyJsonBackupFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.json');
}

export function isZipArchiveFile(file: File): boolean {
	const name = file.name.toLowerCase();
	return name.endsWith('.zip') || name.endsWith('.yamadori.zip');
}
