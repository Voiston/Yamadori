import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativeApp, isAndroidApp } = vi.hoisted(() => ({
	isNativeApp: vi.fn(() => false),
	isAndroidApp: vi.fn(() => false)
}));

const saveToDownloadsMock = vi.hoisted(() =>
	vi.fn(async () => ({ uri: 'content://downloads/1', fileName: 'photo.jpg' }))
);

vi.mock('$lib/utils/platform', () => ({ isNativeApp, isAndroidApp }));
vi.mock('$lib/utils/archive/yamadoriBackupPlugin', () => ({
	YamadoriBackup: {
		saveToDownloads: saveToDownloadsMock
	}
}));

import { downloadPhoto } from './photoDownload';

const tinyJpeg =
	'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

describe('downloadPhoto', () => {
	beforeEach(() => {
		isNativeApp.mockReset();
		isAndroidApp.mockReset();
		saveToDownloadsMock.mockClear();
		isNativeApp.mockReturnValue(false);
		isAndroidApp.mockReturnValue(false);
	});

	it('returns failed for empty src', async () => {
		await expect(downloadPhoto('')).resolves.toBe('failed');
		expect(saveToDownloadsMock).not.toHaveBeenCalled();
	});

	it('saves to downloads on native android', async () => {
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);

		const result = await downloadPhoto(tinyJpeg, 'tree.jpg');

		expect(result).toBe('saved');
		expect(saveToDownloadsMock).toHaveBeenCalledWith({
			data: tinyJpeg.slice(tinyJpeg.indexOf(',') + 1),
			fileName: 'tree.jpg',
			mimeType: 'image/jpeg'
		});
	});

	it('downloads via anchor on web', async () => {
		const click = vi.fn();
		const anchor = {
			href: '',
			download: '',
			click
		};
		const createElement = vi.fn(() => anchor);
		vi.stubGlobal('document', { createElement });
		const createObjectURL = vi.fn(() => 'blob:mock');
		const revokeObjectURL = vi.fn();
		vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

		const result = await downloadPhoto(tinyJpeg, 'tree.jpg');

		expect(result).toBe('downloaded');
		expect(saveToDownloadsMock).not.toHaveBeenCalled();
		expect(createElement).toHaveBeenCalledWith('a');
		expect(anchor.download).toBe('tree.jpg');
		expect(click).toHaveBeenCalled();
		expect(createObjectURL).toHaveBeenCalled();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

		vi.unstubAllGlobals();
	});

	it('returns failed when android save rejects', async () => {
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);
		saveToDownloadsMock.mockRejectedValueOnce(new Error('denied'));

		await expect(downloadPhoto(tinyJpeg)).resolves.toBe('failed');
	});
});
