import type { Tree, VoiceNote } from '$lib/types/tree';
import { zip } from 'fflate';
import { sha256Hex } from './checksums';
import { encryptPayload, encryptEnvelope, ivToBase64 } from './crypto';
import {
	extensionForMime,
	mediaZipPath,
	opaqueMediaId,
	parseDataUrl
} from './media';
import {
	ARCHIVE_FORMAT_VERSION,
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

const MANIFEST_PATH = 'manifest.json';
const DONNEES_PATH = 'donnees.enc';

type MediaCollector = {
	files: ZipEntryMap;
	paths: string[];
};

function createMediaCollector(): MediaCollector {
	return { files: {}, paths: [] };
}

function addMediaFromDataUrl(
	collector: MediaCollector,
	dataUrl: string,
	filename: string
): string {
	if (!dataUrl.trim()) return '';

	const parsed = parseDataUrl(dataUrl);
	if (!parsed || parsed.bytes.length === 0) return '';

	const opaqueId = opaqueMediaId();
	const ext = extensionForMime(parsed.mimeType);
	const path = mediaZipPath(opaqueId, `${filename}.${ext}`);
	collector.files[path] = parsed.bytes;
	collector.paths.push(path);
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
	const photos = tree.photos.map((photo, index) =>
		addMediaFromDataUrl(collector, photo, String(index))
	);

	const voiceNote: VoiceNoteArchive | null = tree.voiceNote
		? exportVoiceNote(tree.voiceNote, collector, 'voice')
		: null;

	const visits: TreeVisitArchive[] = tree.visits.map((visit) => ({
		id: visit.id,
		visitedAt: visit.visitedAt,
		note: visit.note,
		photoPath: addMediaFromDataUrl(collector, visit.photoBase64, `v-${visit.id}`),
		voiceNote: visit.voiceNote
			? exportVoiceNote(visit.voiceNote, collector, `voice-${visit.id}`)
			: null
	}));

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
		locationSettings: input.locationSettings
	};

	const plaintext = JSON.stringify(payload);
	const { ciphertext, iv } = await encryptPayload(plaintext);

	onProgress?.('encrypt', 60);

	const zipFiles: ZipEntryMap = {
		...collector.files,
		[DONNEES_PATH]: ciphertext
	};

	const fileEntries = await buildFileEntries(zipFiles);
	const manifest: ArchiveManifest = {
		formatVersion: ARCHIVE_FORMAT_VERSION,
		appVersion: input.appVersion,
		exportedAt: new Date().toISOString(),
		encryption: {
			algorithm: 'AES-256-GCM',
			keyScope: 'app',
			iv: ivToBase64(iv)
		},
		stats: {
			treeCount: trees.length,
			mediaFileCount: collector.paths.length
		},
		files: fileEntries
	};

	const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
	zipFiles[MANIFEST_PATH] = manifestBytes;

	onProgress?.('zip', 80);

	const zipped = await new Promise<Uint8Array>((resolve, reject) => {
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
