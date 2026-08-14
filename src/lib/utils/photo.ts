import * as m from '$lib/paraglide/messages.js';

/** Max width for list thumbnails (TreeCard, gallery strip). */
export const PHOTO_THUMB_MAX_WIDTH = 128;
/** JPEG quality for thumbnails. */
export const PHOTO_THUMB_JPEG_QUALITY = 0.7;

/** Max width for stored photos and native camera capture (keeps WebView RAM in check). */
export const PHOTO_MAX_WIDTH = 1440;
/** Canvas JPEG quality (0–1) when re-encoding on save. */
export const PHOTO_JPEG_QUALITY = 0.85;
/** Capacitor Camera quality (0–100); aligned with PHOTO_JPEG_QUALITY. */
export const CAPTURE_JPEG_QUALITY = 85;

const COMPRESS_TIMEOUT_MS = 15_000;
const NATIVE_CAMERA_FILE_PATTERN = /^yamadori-\d+\.jpe?g$/i;

export type PhotoEncoding = {
	full: string;
	thumb: string;
};

export type PhotoEncodingResult = PhotoEncoding & {
	previewBlob: Blob;
	previewFile: File;
};

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === 'string') {
				resolve(reader.result);
				return;
			}
			reject(new Error(m.error_photo_read()));
		};
		reader.onerror = () => reject(new Error(m.error_photo_read()));
		reader.readAsDataURL(file);
	});
}

type SizedImage = {
	canvas: HTMLCanvasElement;
	width: number;
	height: number;
};

export function scaleImageDimensions(
	width: number,
	height: number,
	maxWidth = PHOTO_MAX_WIDTH
): { width: number; height: number } {
	if (width <= maxWidth) {
		return { width, height };
	}
	return {
		width: maxWidth,
		height: Math.round((height * maxWidth) / width)
	};
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(m.error_photo_load()));
		};

		img.src = url;
	});
}

function loadSizedCanvas(file: File, maxWidth = PHOTO_MAX_WIDTH): Promise<SizedImage> {
	return loadImageElement(file).then((img) => {
		const { width, height } = scaleImageDimensions(img.width, img.height, maxWidth);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error(m.error_photo_canvas());
		}

		ctx.drawImage(img, 0, 0, width, height);
		return { canvas, width, height };
	});
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	quality = PHOTO_JPEG_QUALITY
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
					return;
				}
				reject(new Error(m.error_photo_canvas()));
			},
			'image/jpeg',
			quality
		);
	});
}

function encodeThumbFromCanvas(
	source: HTMLCanvasElement,
	sourceWidth: number,
	sourceHeight: number,
	maxWidth = PHOTO_THUMB_MAX_WIDTH,
	quality = PHOTO_THUMB_JPEG_QUALITY
): string {
	const { width, height } = scaleImageDimensions(sourceWidth, sourceHeight, maxWidth);
	const thumbCanvas = document.createElement('canvas');
	thumbCanvas.width = width;
	thumbCanvas.height = height;

	const ctx = thumbCanvas.getContext('2d');
	if (!ctx) {
		throw new Error(m.error_photo_canvas());
	}

	ctx.drawImage(source, 0, 0, width, height);
	return thumbCanvas.toDataURL('image/jpeg', quality);
}

function encodeFromSizedCanvas(
	sized: SizedImage,
	fullQuality = PHOTO_JPEG_QUALITY,
	thumbMaxWidth = PHOTO_THUMB_MAX_WIDTH,
	thumbQuality = PHOTO_THUMB_JPEG_QUALITY
): PhotoEncoding {
	const full = sized.canvas.toDataURL('image/jpeg', fullQuality);
	const thumb = encodeThumbFromCanvas(
		sized.canvas,
		sized.width,
		sized.height,
		thumbMaxWidth,
		thumbQuality
	);
	return { full, thumb };
}

function previewFileFromBlob(blob: Blob, sourceName: string): File {
	const baseName = sourceName.replace(/\.[^.]+$/, '') || 'yamadori-photo';
	return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

function withCompressTimeout<T>(promise: Promise<T>): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error(m.error_compression_timeout())), COMPRESS_TIMEOUT_MS);
		})
	]);
}

/** True when Capacitor Camera already produced a storage-ready JPEG. */
export function isNativeCameraReadyFile(file: File): boolean {
	return file.type === 'image/jpeg' && NATIVE_CAMERA_FILE_PATTERN.test(file.name);
}

/** Single decode/encode pass for full + thumb + preview blob. */
export async function encodePhotoFile(file: File): Promise<PhotoEncodingResult> {
	if (isNativeCameraReadyFile(file)) {
		return encodeNativeCameraFile(file);
	}

	const sized = await withCompressTimeout(loadSizedCanvas(file));
	const { full, thumb } = encodeFromSizedCanvas(sized);
	const previewBlob = await canvasToBlob(sized.canvas);
	const previewFile = previewFileFromBlob(previewBlob, file.name);
	return { full, thumb, previewBlob, previewFile };
}

/** Native JPEG at target size — read full as-is, thumb from one image decode. */
export async function encodeNativeCameraFile(file: File): Promise<PhotoEncodingResult> {
	const work = async (): Promise<PhotoEncodingResult> => {
		const [full, img] = await Promise.all([readFileAsDataUrl(file), loadImageElement(file)]);
		const thumbDims = scaleImageDimensions(img.width, img.height, PHOTO_THUMB_MAX_WIDTH);
		const thumbCanvas = document.createElement('canvas');
		thumbCanvas.width = thumbDims.width;
		thumbCanvas.height = thumbDims.height;
		const ctx = thumbCanvas.getContext('2d');
		if (!ctx) {
			throw new Error(m.error_photo_canvas());
		}
		ctx.drawImage(img, 0, 0, thumbDims.width, thumbDims.height);
		const thumb = thumbCanvas.toDataURL('image/jpeg', PHOTO_THUMB_JPEG_QUALITY);
		return { full, thumb, previewBlob: file, previewFile: file };
	};

	return withCompressTimeout(work());
}

export async function compressImageToBlob(
	file: File,
	maxWidth = PHOTO_MAX_WIDTH,
	quality = PHOTO_JPEG_QUALITY
): Promise<Blob> {
	const { canvas } = await withCompressTimeout(loadSizedCanvas(file, maxWidth));
	return canvasToBlob(canvas, quality);
}

export async function compressImageToPreviewFile(file: File): Promise<File> {
	const encoded = await encodePhotoFile(file);
	return encoded.previewFile;
}

export async function compressImage(
	file: File,
	maxWidth = PHOTO_MAX_WIDTH,
	quality = PHOTO_JPEG_QUALITY
): Promise<string> {
	const { canvas } = await withCompressTimeout(loadSizedCanvas(file, maxWidth));
	return canvas.toDataURL('image/jpeg', quality);
}

export async function compressImageWithFallback(file: File): Promise<string> {
	try {
		return await compressImage(file);
	} catch {
		return readFileAsDataUrl(file);
	}
}

export async function compressImageToThumbDataUrl(
	dataUrl: string,
	maxWidth = PHOTO_THUMB_MAX_WIDTH,
	quality = PHOTO_THUMB_JPEG_QUALITY
): Promise<string> {
	const response = await fetch(dataUrl);
	const blob = await response.blob();
	const file = new File([blob], 'thumb-source.jpg', { type: blob.type || 'image/jpeg' });
	return compressImage(file, maxWidth, quality);
}

/** Full-size storage encoding plus a list thumbnail from a single source decode. */
export async function photoFileToStorageWithThumb(file: File): Promise<PhotoEncoding> {
	const encoded = await encodePhotoFile(file);
	return { full: encoded.full, thumb: encoded.thumb };
}

/** Use for files already compressed for preview (JPEG from encodePhotoFile). */
export async function photoFileToStorageBase64(file: File): Promise<string> {
	if (file.type === 'image/jpeg') {
		return readFileAsDataUrl(file);
	}
	return compressImageWithFallback(file);
}
