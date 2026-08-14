import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	PHOTO_MAX_WIDTH,
	PHOTO_THUMB_MAX_WIDTH,
	encodeNativeCameraFile,
	encodePhotoFile,
	isNativeCameraReadyFile,
	photoFileToStorageWithThumb,
	scaleImageDimensions
} from './photo';

describe('scaleImageDimensions', () => {
	it('keeps images within the max width unchanged', () => {
		expect(scaleImageDimensions(800, 600)).toEqual({ width: 800, height: 600 });
	});

	it('scales wide images down to PHOTO_MAX_WIDTH', () => {
		expect(scaleImageDimensions(2400, 1800)).toEqual({
			width: PHOTO_MAX_WIDTH,
			height: 1080
		});
	});

	it('caps thumbnail width', () => {
		expect(scaleImageDimensions(4000, 3000, PHOTO_THUMB_MAX_WIDTH)).toEqual({
			width: PHOTO_THUMB_MAX_WIDTH,
			height: 96
		});
	});
});

describe('isNativeCameraReadyFile', () => {
	it('detects native camera JPEG files', () => {
		const file = new File(['jpeg'], 'yamadori-1710000000000.jpg', { type: 'image/jpeg' });
		expect(isNativeCameraReadyFile(file)).toBe(true);
	});

	it('rejects non-native JPEG names', () => {
		const file = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' });
		expect(isNativeCameraReadyFile(file)).toBe(false);
	});
});

describe('encodePhotoFile', () => {
	let drawImage: ReturnType<typeof vi.fn>;
	let toDataURL: ReturnType<typeof vi.fn>;
	let toBlob: ReturnType<typeof vi.fn>;
	let canvasCreates = 0;

	beforeEach(() => {
		canvasCreates = 0;
		drawImage = vi.fn();
		toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,ZmFrZQ==');
		toBlob = vi.fn((callback: BlobCallback) => {
			callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
		});

		class MockImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			width = 3200;
			height = 2400;
			set src(_value: string) {
				this.onload?.();
			}
		}

		vi.stubGlobal(
			'document',
			{
				createElement: (tagName: string) => {
					if (tagName !== 'canvas') {
						throw new Error(`Unexpected element: ${tagName}`);
					}
					canvasCreates += 1;
					return {
						width: 0,
						height: 0,
						getContext: () => ({ drawImage }),
						toDataURL,
						toBlob
					};
				}
			} as Document
		);

		vi.stubGlobal('Image', MockImage);
		vi.stubGlobal('URL', {
			createObjectURL: vi.fn().mockReturnValue('blob:mock'),
			revokeObjectURL: vi.fn()
		});

		class MockFileReader {
			result: string | ArrayBuffer | null = null;
			onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
			onerror: (() => void) | null = null;
			readAsDataURL() {
				this.result = 'data:image/jpeg;base64,bmF0aXZl';
				this.onload?.({} as ProgressEvent<FileReader>);
			}
		}

		vi.stubGlobal('FileReader', MockFileReader);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('encodes full and thumb from a single sized canvas decode', async () => {
		const file = new File(['pixels'], 'forest.png', { type: 'image/png' });
		const encoded = await encodePhotoFile(file);

		expect(encoded.full).toBe('data:image/jpeg;base64,ZmFrZQ==');
		expect(encoded.thumb).toBe('data:image/jpeg;base64,ZmFrZQ==');
		expect(encoded.previewFile.type).toBe('image/jpeg');
		expect(canvasCreates).toBe(2);
		expect(toDataURL).toHaveBeenCalledTimes(2);
	});

	it('uses native fast path without resizing full JPEG', async () => {
		const file = new File(['jpeg'], 'yamadori-1710000000000.jpg', { type: 'image/jpeg' });
		const encoded = await encodeNativeCameraFile(file);

		expect(encoded.full).toBe('data:image/jpeg;base64,bmF0aXZl');
		expect(encoded.previewFile).toBe(file);
		expect(canvasCreates).toBe(1);
	});

	it('photoFileToStorageWithThumb shares one encode pass', async () => {
		const file = new File(['pixels'], 'visit.png', { type: 'image/png' });
		const stored = await photoFileToStorageWithThumb(file);

		expect(stored.full).toBe('data:image/jpeg;base64,ZmFrZQ==');
		expect(stored.thumb).toBe('data:image/jpeg;base64,ZmFrZQ==');
		expect(canvasCreates).toBe(2);
	});
});
