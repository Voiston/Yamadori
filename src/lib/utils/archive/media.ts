import { generateId } from '$lib/utils/id';

const MIME_EXTENSION: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'audio/webm': 'webm',
	'audio/ogg': 'ogg',
	'audio/mp4': 'm4a',
	'audio/mpeg': 'mp3',
	'audio/aac': 'aac'
};

const EXTENSION_MIME: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	webm: 'audio/webm',
	ogg: 'audio/ogg',
	m4a: 'audio/mp4',
	mp3: 'audio/mpeg',
	aac: 'audio/aac'
};

export function opaqueMediaId(): string {
	return generateId().replaceAll('-', '').slice(0, 12);
}

export function extensionForMime(mimeType: string): string {
	const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
	return MIME_EXTENSION[normalized] ?? 'bin';
}

export function mimeTypeForExtension(filename: string): string | null {
	const lower = filename.toLowerCase();
	const dotIndex = lower.lastIndexOf('.');
	if (dotIndex < 0) return null;
	return EXTENSION_MIME[lower.slice(dotIndex + 1)] ?? null;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; bytes: Uint8Array } | null {
	if (!dataUrl.startsWith('data:')) return null;

	const commaIndex = dataUrl.indexOf(',');
	if (commaIndex < 0) return null;

	const metadata = dataUrl.slice(5, commaIndex);
	const payload = dataUrl.slice(commaIndex + 1);
	const isBase64 = metadata.toLowerCase().includes(';base64');
	const mimeType =
		metadata
			.replace(/;base64.*$/i, '')
			.split(';')[0]
			?.trim() || 'application/octet-stream';

	if (isBase64) {
		try {
			const binary = atob(payload);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
			if (bytes.length === 0) return null;
			return { mimeType, bytes };
		} catch {
			return null;
		}
	}

	try {
		return { mimeType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
	} catch {
		return null;
	}
}

export function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return `data:${mimeType};base64,${btoa(binary)}`;
}

export function mediaZipPath(opaqueId: string, filename: string): string {
	return `media/${opaqueId}/${filename}`;
}

export function isJpegMime(mimeType: string): boolean {
	const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
	return normalized === 'image/jpeg' || normalized === 'image/jpg';
}

const JPEG_SOI = [0xff, 0xd8, 0xff] as const;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47] as const;

export type RasterImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

function startsWithBytes(bytes: Uint8Array, signature: readonly number[]): boolean {
	if (bytes.length < signature.length) return false;
	return signature.every((value, index) => bytes[index] === value);
}

export function sniffRasterImageMime(bytes: Uint8Array): RasterImageMime | null {
	if (startsWithBytes(bytes, JPEG_SOI)) return 'image/jpeg';
	if (startsWithBytes(bytes, PNG_SIG)) return 'image/png';
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'image/webp';
	}
	return null;
}

export function isDangerousMarkup(bytes: Uint8Array): boolean {
	const prefix = new TextDecoder('utf-8', { fatal: false })
		.decode(bytes.slice(0, 512))
		.replace(/^\uFEFF/, '')
		.trimStart()
		.toLowerCase();
	if (!prefix.startsWith('<')) return false;
	return (
		prefix.startsWith('<svg') ||
		prefix.startsWith('<html') ||
		prefix.startsWith('<!doctype') ||
		prefix.startsWith('<?xml') ||
		prefix.includes('<script')
	);
}

function normalizeClaimedImageMime(claimed?: string | null): RasterImageMime | null {
	const normalized = claimed?.split(';')[0]?.trim().toLowerCase() ?? '';
	if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'image/jpeg';
	if (normalized === 'image/png') return 'image/png';
	if (normalized === 'image/webp') return 'image/webp';
	return null;
}

const ALLOWED_AUDIO_MIME = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac']);

function normalizeClaimedAudioMime(claimed?: string | null): string | null {
	const normalized = claimed?.split(';')[0]?.trim().toLowerCase() ?? '';
	return ALLOWED_AUDIO_MIME.has(normalized) ? normalized : null;
}

/** Keep real JPEG/PNG/WebP; drop SVG/HTML; keep claimed raster if magic is unknown. */
export function sanitizeImageBytes(bytes: Uint8Array, claimedMime?: string | null): string {
	if (bytes.length === 0) return '';
	const sniffed = sniffRasterImageMime(bytes);
	if (sniffed) {
		return bytesToDataUrl(bytes, sniffed);
	}
	if (isDangerousMarkup(bytes)) {
		return '';
	}
	const claimed = normalizeClaimedImageMime(claimedMime);
	if (claimed) {
		return bytesToDataUrl(bytes, claimed);
	}
	return '';
}

export function sanitizeImageDataUrl(dataUrl: string): string {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) return '';
	return sanitizeImageBytes(parsed.bytes, parsed.mimeType);
}

/** Drop markup disguised as audio; keep declared audio/* (including short test payloads). */
export function sanitizeAudioBytes(bytes: Uint8Array, claimedMime?: string | null): string {
	if (bytes.length === 0) return '';
	if (isDangerousMarkup(bytes)) {
		return '';
	}
	const claimed = normalizeClaimedAudioMime(claimedMime);
	if (!claimed) {
		return '';
	}
	return bytesToDataUrl(bytes, claimed);
}

export function sanitizeAudioDataUrl(dataUrl: string, claimedMime?: string | null): string {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) return '';
	return sanitizeAudioBytes(parsed.bytes, claimedMime ?? parsed.mimeType);
}

export function resolveSafeDownloadImageMime(dataUrl: string): RasterImageMime | null {
	const parsed = parseDataUrl(dataUrl);
	if (!parsed) return null;
	const sniffed = sniffRasterImageMime(parsed.bytes);
	if (sniffed) return sniffed;
	if (isDangerousMarkup(parsed.bytes)) return null;
	return normalizeClaimedImageMime(parsed.mimeType);
}
