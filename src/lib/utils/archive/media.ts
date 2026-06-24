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

	return { mimeType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
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
