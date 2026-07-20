import { YamadoriBackup } from '$lib/utils/archive/yamadoriBackupPlugin';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';

export type PhotoDownloadResult = 'downloaded' | 'saved' | 'failed';

function dataUrlToBase64(dataUrl: string): string {
	const commaIndex = dataUrl.indexOf(',');
	return commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
}

function mimeTypeFromDataUrl(dataUrl: string): string {
	const match = /^data:([^;,]+)/i.exec(dataUrl);
	return match?.[1] ?? 'image/jpeg';
}

function extensionForMime(mimeType: string): string {
	if (mimeType === 'image/png') return 'png';
	if (mimeType === 'image/webp') return 'webp';
	return 'jpg';
}

function defaultFileName(mimeType: string): string {
	return `yamadori-photo-${Date.now()}.${extensionForMime(mimeType)}`;
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

function dataUrlToBlob(dataUrl: string): Blob {
	const base64 = dataUrlToBase64(dataUrl);
	const mimeType = mimeTypeFromDataUrl(dataUrl);
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: mimeType });
}

export async function downloadPhoto(
	dataUrl: string,
	fileName?: string
): Promise<PhotoDownloadResult> {
	if (!dataUrl) {
		return 'failed';
	}

	const mimeType = mimeTypeFromDataUrl(dataUrl);
	const resolvedName = fileName?.trim() || defaultFileName(mimeType);

	try {
		if (isNativeApp() && isAndroidApp()) {
			await YamadoriBackup.saveToDownloads({
				data: dataUrlToBase64(dataUrl),
				fileName: resolvedName,
				mimeType
			});
			return 'saved';
		}

		downloadBlob(dataUrlToBlob(dataUrl), resolvedName);
		return 'downloaded';
	} catch {
		return 'failed';
	}
}
