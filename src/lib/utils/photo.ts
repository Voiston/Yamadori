import * as m from '$lib/paraglide/messages.js';

/** Max width for stored photos and native camera capture (keeps WebView RAM in check). */
export const PHOTO_MAX_WIDTH = 1440;
/** Canvas JPEG quality (0–1) when re-encoding on save. */
export const PHOTO_JPEG_QUALITY = 0.85;
/** Capacitor Camera quality (0–100); aligned with PHOTO_JPEG_QUALITY. */
export const CAPTURE_JPEG_QUALITY = 85;

const COMPRESS_TIMEOUT_MS = 15_000;
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

export async function compressImage(
	file: File,
	maxWidth = PHOTO_MAX_WIDTH,
	quality = PHOTO_JPEG_QUALITY
): Promise<string> {
	const compressPromise = new Promise<string>((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);

			let { width, height } = img;
			if (width > maxWidth) {
				height = Math.round((height * maxWidth) / width);
				width = maxWidth;
			}

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error(m.error_photo_canvas()));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL('image/jpeg', quality));
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error(m.error_photo_load()));
		};

		img.src = url;
	});

	const timeoutPromise = new Promise<string>((_, reject) => {
		setTimeout(() => reject(new Error(m.error_compression_timeout())), COMPRESS_TIMEOUT_MS);
	});

	return Promise.race([compressPromise, timeoutPromise]);
}

export async function compressImageWithFallback(file: File): Promise<string> {
	try {
		return await compressImage(file);
	} catch {
		return readFileAsDataUrl(file);
	}
}
