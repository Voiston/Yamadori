import * as m from '$lib/paraglide/messages.js';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { YamadoriBackup } from './yamadoriBackupPlugin';

export type ArchiveDeliveryMode = 'share' | 'local';
export type ArchiveDeliveryResult = 'shared' | 'downloaded' | 'saved';

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

async function shareArchive(blob: Blob, filename: string): Promise<'shared'> {
	const base64 = await blobToBase64(blob);

	await Filesystem.writeFile({
		path: filename,
		data: base64,
		directory: Directory.Cache
	});

	const { uri } = await Filesystem.getUri({
		path: filename,
		directory: Directory.Cache
	});

	await Share.share({
		title: m.backup_export_dialog_title(),
		files: [uri],
		dialogTitle: m.backup_export_dialog_title()
	});

	return 'shared';
}

async function saveArchiveToDownloads(blob: Blob, filename: string): Promise<'saved'> {
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
			return saveArchiveToDownloads(blob, filename);
		}
		downloadBlob(blob, filename);
		return 'downloaded';
	}

	return shareArchive(blob, filename);
}
