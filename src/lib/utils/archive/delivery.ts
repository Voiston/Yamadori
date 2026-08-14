import * as m from '$lib/paraglide/messages.js';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { YamadoriBackup } from './yamadoriBackupPlugin';

export type ArchiveDeliveryMode = 'share' | 'local';
export type ArchiveDeliveryResult = 'shared' | 'downloaded' | 'saved';

/** Safe limit for base64 payloads sent through the Capacitor JS bridge. */
export const BRIDGE_BASE64_MAX_BYTES = 1_000_000;

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result !== 'string') {
				reject(new Error(m.error_file_read()));
				return;
			}
			const comma = result.indexOf(',');
			resolve(comma >= 0 ? result.slice(comma + 1) : result);
		};
		reader.onerror = () => reject(reader.error ?? new Error(m.error_file_read()));
		reader.readAsDataURL(blob);
	});
}

function isShareCanceled(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return message.includes('cancel') || error.name === 'AbortError';
}

const EXPORT_CACHE_DIR = 'exports';

async function writeArchiveToCache(blob: Blob, filename: string): Promise<string> {
	try {
		await Filesystem.mkdir({
			path: EXPORT_CACHE_DIR,
			directory: Directory.Cache,
			recursive: true
		});
	} catch {
		// Directory may already exist.
	}

	const base64 = await blobToBase64(blob);
	const cachePath = `${EXPORT_CACHE_DIR}/${filename}`;
	await Filesystem.writeFile({
		path: cachePath,
		data: base64,
		directory: Directory.Cache
	});
	const { uri } = await Filesystem.getUri({
		path: cachePath,
		directory: Directory.Cache
	});
	return uri;
}

async function shareArchive(blob: Blob, filename: string): Promise<'shared'> {
	const uri = await writeArchiveToCache(blob, filename);

	try {
		await Share.share({
			title: m.backup_export_dialog_title(),
			files: [uri],
			dialogTitle: m.backup_export_dialog_title()
		});
	} catch (error) {
		if (isShareCanceled(error)) {
			throw new Error(m.settings_export_share_canceled());
		}
		throw error;
	}

	return 'shared';
}

async function saveArchiveToDownloads(blob: Blob, filename: string): Promise<'saved'> {
	const uri = await writeArchiveToCache(blob, filename);
	await YamadoriBackup.saveToDownloadsFromPath({
		cacheUri: uri,
		fileName: filename,
		mimeType: 'application/zip'
	});
	return 'saved';
}

async function saveArchiveToDownloadsLegacy(blob: Blob, filename: string): Promise<'saved'> {
	const base64 = await blobToBase64(blob);
	await YamadoriBackup.saveToDownloads({
		data: base64,
		fileName: filename,
		mimeType: 'application/zip'
	});
	return 'saved';
}

export async function deliverArchive(
	blob: Blob,
	filename: string,
	mode: ArchiveDeliveryMode = 'share'
): Promise<ArchiveDeliveryResult> {
	if (!isNativeApp()) {
		downloadBlob(blob, filename);
		return 'downloaded';
	}

	if (mode === 'local') {
		if (isAndroidApp()) {
			if (blob.size <= BRIDGE_BASE64_MAX_BYTES) {
				try {
					return await saveArchiveToDownloadsLegacy(blob, filename);
				} catch {
					// Fall through to path-based delivery for large payloads or plugin issues.
				}
			}
			return saveArchiveToDownloads(blob, filename);
		}
		downloadBlob(blob, filename);
		return 'downloaded';
	}

	return shareArchive(blob, filename);
}
