import { YamadoriBackup } from '$lib/utils/archive/yamadoriBackupPlugin';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import {
	bytesToDataUrl,
	parseDataUrl,
	resolveSafeDownloadImageMime,
	type RasterImageMime
} from '$lib/utils/archive/media';

export type PhotoDownloadResult = 'downloaded' | 'saved' | 'failed';

function extensionForMime(mimeType: RasterImageMime): string {
	if (mimeType === 'image/png') return 'png';
	if (mimeType === 'image/webp') return 'webp';
	return 'jpg';
}

function defaultFileName(mimeType: RasterImageMime): string {
	return `yamadori-photo-${Date.now()}.${extensionForMime(mimeType)}`;
}

function withSafeExtension(fileName: string, mimeType: RasterImageMime): string {
	const ext = extensionForMime(mimeType);
	const trimmed = fileName.trim();
	if (!trimmed) return defaultFileName(mimeType);
	const base = trimmed.replace(/\.[^.]+$/, '');
	return `${base || trimmed}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

export async function downloadPhoto(
	dataUrl: string,
	fileName?: string
): Promise<PhotoDownloadResult> {
	if (!dataUrl) {
		return 'failed';
	}

	const mimeType = resolveSafeDownloadImageMime(dataUrl);
	const parsed = parseDataUrl(dataUrl);
	if (!mimeType || !parsed) {
		return 'failed';
	}

	const safeDataUrl = bytesToDataUrl(parsed.bytes, mimeType);
	const resolvedName = withSafeExtension(fileName?.trim() || defaultFileName(mimeType), mimeType);
	const commaIndex = safeDataUrl.indexOf(',');
	const base64 = commaIndex >= 0 ? safeDataUrl.slice(commaIndex + 1) : safeDataUrl;

	try {
		if (isNativeApp() && isAndroidApp()) {
			await YamadoriBackup.saveToDownloads({
				data: base64,
				fileName: resolvedName,
				mimeType
			});
			return 'saved';
		}

		downloadBlob(new Blob([parsed.bytes as BlobPart], { type: mimeType }), resolvedName);
		return 'downloaded';
	} catch {
		return 'failed';
	}
}
