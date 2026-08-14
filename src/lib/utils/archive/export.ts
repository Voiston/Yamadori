import type { Tree, VoiceNote } from '$lib/types/tree';
import { zip } from 'fflate';
import { sha256Hex } from './checksums';
import { encryptEnvelope } from './crypto';
import {
	extensionForMime,
	mediaZipPath,
	opaqueMediaId,
	parseDataUrl
} from './media';
import {
	ARCHIVE_DONNEES_JSON_PATH,
	ARCHIVE_FORMAT_VERSION,
	ARCHIVE_MANIFEST_PATH,
	type ArchiveBuildOptions,
	type ArchiveExportInput,
	type ArchiveFileEntry,
	type ArchiveManifest,
	type ArchiveProgressCallback,
	type TreeArchive,
	type TreeVisitArchive,
	type VoiceNoteArchive,
	voiceNoteToArchive,
	type YamadoriArchiveData,
	type ZipEntryMap
} from './types';

type MediaCollector = {
	files: ZipEntryMap;
	paths: string[];
	dataUrlToPath: Map<string, string>;
};

function createMediaCollector(): MediaCollector {
	return { files: {}, paths: [], dataUrlToPath: new Map() };
}

function addMediaFromDataUrl(
	collector: MediaCollector,
	dataUrl: string,
	filename: string
): string {
	if (!dataUrl.trim()) return '';

	const cached = collector.dataUrlToPath.get(dataUrl);
	if (cached) return cached;

	const parsed = parseDataUrl(dataUrl);
	if (!parsed || parsed.bytes.length === 0) return '';

	const opaqueId = opaqueMediaId();
	const ext = extensionForMime(parsed.mimeType);
	const path = mediaZipPath(opaqueId, `${filename}.${ext}`);
	collector.files[path] = parsed.bytes;
	collector.paths.push(path);
	collector.dataUrlToPath.set(dataUrl, path);
	return path;
}

function exportVoiceNote(
	note: VoiceNote,
	collector: MediaCollector,
	filename: string
): VoiceNoteArchive | null {
	const mediaPath = addMediaFromDataUrl(collector, note.audioBase64, filename);
	if (!mediaPath) return null;
	return voiceNoteToArchive(note, mediaPath);
}

function treeToArchive(tree: Tree, collector: MediaCollector): TreeArchive {
	const visits: TreeVisitArchive[] = tree.visits.map((visit) => {
		const photoPaths = visit.photos
			.map((photo, index) =>
				addMediaFromDataUrl(collector, photo, `v-${visit.id}-${index}`)
			)
			.filter(Boolean);
		return {
			id: visit.id,
			visitedAt: visit.visitedAt,
			note: visit.note,
			photoPaths,
			photoPath: photoPaths[0] ?? '',
			voiceNote: visit.voiceNote
				? exportVoiceNote(visit.voiceNote, collector, `voice-${visit.id}`)
				: null,
			yrsSnapshot: visit.yrsSnapshot ?? null
		};
	});

	const photos = tree.photos.map((photo, index) => {
		if (!photo.trim()) return '';
		return (
			collector.dataUrlToPath.get(photo) ??
			addMediaFromDataUrl(collector, photo, `orphan-${index}`)
		);
	});

	const voiceNote: VoiceNoteArchive | null = tree.voiceNote
		? exportVoiceNote(tree.voiceNote, collector, 'voice')
		: null;

	return {
		id: tree.id,
		species: tree.species,
		notes: tree.notes,
		photos,
		visits,
		assessment: tree.assessment,
		voiceNote,
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

async function buildFileEntries(files: ZipEntryMap): Promise<ArchiveFileEntry[]> {
	const entries: ArchiveFileEntry[] = [];
	for (const [path, data] of Object.entries(files)) {
		entries.push({
			path,
			size: data.byteLength,
			sha256: await sha256Hex(data)
		});
	}
	return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function zipEntries(zipFiles: ZipEntryMap): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const zipInput: Record<string, Uint8Array> = {};
		for (const [path, data] of Object.entries(zipFiles)) {
			zipInput[path] = data;
		}

		zip(
			zipInput,
			{
				level: 6,
				mem: 8
			},
			(error, result) => {
				if (error) reject(error);
				else resolve(result);
			}
		);
	});
}

/**
 * Build a Yamadori archive.
 * - Without password: honest plaintext ZIP (`donnees.json`, `encryption: null`).
 * - With password: same plaintext ZIP wrapped in a PBKDF2 password envelope
 *   (key never stored in the archive).
 */
export async function buildArchive(
	input: ArchiveExportInput,
	options?: ArchiveBuildOptions | ArchiveProgressCallback
): Promise<Blob> {
	const { password, onProgress } =
		typeof options === 'function' ? { onProgress: options } : (options ?? {});
	const collector = createMediaCollector();
	const trees = input.trees.map((tree) => treeToArchive(tree, collector));

	onProgress?.('media', 40);

	const payload: YamadoriArchiveData = {
		version: ARCHIVE_FORMAT_VERSION,
		trees,
		parking: input.parking,
		appearanceSettings: input.appearanceSettings,
		...(input.apiSettings ? { apiSettings: input.apiSettings } : {})
	};

	const plaintextBytes = new TextEncoder().encode(JSON.stringify(payload));

	onProgress?.('encrypt', 60);

	const zipFiles: ZipEntryMap = {
		...collector.files,
		[ARCHIVE_DONNEES_JSON_PATH]: plaintextBytes
	};

	const fileEntries = await buildFileEntries(zipFiles);
	const manifest: ArchiveManifest = {
		formatVersion: ARCHIVE_FORMAT_VERSION,
		appVersion: input.appVersion,
		exportedAt: new Date().toISOString(),
		encryption: null,
		stats: {
			treeCount: trees.length,
			mediaFileCount: collector.paths.length
		},
		files: fileEntries
	};

	const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
	zipFiles[ARCHIVE_MANIFEST_PATH] = manifestBytes;

	onProgress?.('zip', 80);

	const zipped = await zipEntries(zipFiles);

	onProgress?.('zip', 100);

	const innerBlob = new Blob([new Uint8Array(zipped)], { type: 'application/zip' });

	if (password) {
		const innerBytes = new Uint8Array(await innerBlob.arrayBuffer());
		const envelope = await encryptEnvelope(innerBytes, password);
		return new Blob([new Uint8Array(envelope)], { type: 'application/zip' });
	}

	return innerBlob;
}

export function archiveFilename(): string {
	const date = new Date().toISOString().slice(0, 10);
	return `yamadori-backup-${date}.yamadori.zip`;
}
