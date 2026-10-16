import { describe, expect, it } from 'vitest';
import {
	sanitizeAudioBytes,
	sanitizeImageBytes,
	sanitizeImageDataUrl,
	sniffRasterImageMime
} from './media';

const tinyPng =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function pngBytes(): Uint8Array {
	const binary = atob(tinyPng.slice(tinyPng.indexOf(',') + 1));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function encodeUtf8(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

describe('archive media sanitizer', () => {
	it('sniffs a real PNG regardless of claimed MIME', () => {
		const bytes = pngBytes();
		expect(sniffRasterImageMime(bytes)).toBe('image/png');
		expect(sanitizeImageBytes(bytes, 'text/html')).toContain('data:image/png');
		expect(sanitizeImageBytes(bytes, 'image/svg+xml')).toContain('data:image/png');
	});

	it('sniffs JPEG and WebP magic even when claimed as HTML', () => {
		const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		const webp = new Uint8Array([
			0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
		]);
		expect(sniffRasterImageMime(jpeg)).toBe('image/jpeg');
		expect(sanitizeImageBytes(jpeg, 'text/html')).toContain('data:image/jpeg');
		expect(sniffRasterImageMime(webp)).toBe('image/webp');
		expect(sanitizeImageBytes(webp, 'text/html')).toContain('data:image/webp');
	});

	it('keeps claimed JPEG when magic is unknown and payload is not markup', () => {
		const bytes = encodeUtf8('not-an-image');
		expect(sanitizeImageBytes(bytes, 'image/jpeg')).toContain('data:image/jpeg');
	});

	it('drops SVG and HTML even if claimed as jpeg', () => {
		expect(sanitizeImageBytes(encodeUtf8('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/jpeg')).toBe(
			''
		);
		expect(sanitizeImageBytes(encodeUtf8('<!DOCTYPE html><html></html>'), 'image/png')).toBe('');
		expect(sanitizeImageDataUrl('data:image/svg+xml;base64,' + btoa('<svg></svg>'))).toBe('');
	});

	it('keeps declared AAC audio and drops HTML disguised as audio', () => {
		expect(sanitizeAudioBytes(encodeUtf8('AAA'), 'audio/aac')).toContain('data:audio/aac');
		expect(sanitizeAudioBytes(encodeUtf8('<script>alert(1)</script>'), 'audio/aac')).toBe('');
	});
});
