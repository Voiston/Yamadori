import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativeApp, isAndroidApp } = vi.hoisted(() => ({
	isNativeApp: vi.fn(() => false),
	isAndroidApp: vi.fn(() => false)
}));

const shareMock = vi.hoisted(() => vi.fn(async () => undefined));
const writeFileMock = vi.hoisted(() => vi.fn(async () => undefined));
const getUriMock = vi.hoisted(() => vi.fn(async () => ({ uri: 'file://cache/test.yamadori.zip' })));
const saveToDownloadsMock = vi.hoisted(() =>
	vi.fn(async () => ({ uri: 'content://downloads/1', fileName: 'test.yamadori.zip' }))
);

vi.mock('$lib/utils/platform', () => ({ isNativeApp, isAndroidApp }));
vi.mock('@capacitor/share', () => ({ Share: { share: shareMock } }));
vi.mock('@capacitor/filesystem', () => ({
	Directory: { Cache: 'CACHE' },
	Filesystem: {
		writeFile: writeFileMock,
		getUri: getUriMock
	}
}));
vi.mock('./yamadoriBackupPlugin', () => ({
	YamadoriBackup: {
		saveToDownloads: saveToDownloadsMock
	}
}));

class MockFileReader {
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	result: string | ArrayBuffer | null = 'data:application/zip;base64,enA=';

	readAsDataURL() {
		this.onload?.();
	}
}

vi.stubGlobal('FileReader', MockFileReader);

import { deliverArchive } from './delivery';

describe('deliverArchive', () => {
	beforeEach(() => {
		isNativeApp.mockReset();
		isAndroidApp.mockReset();
		shareMock.mockClear();
		writeFileMock.mockClear();
		getUriMock.mockClear();
		saveToDownloadsMock.mockClear();
		isNativeApp.mockReturnValue(false);
		isAndroidApp.mockReturnValue(false);
	});

	it('shares on native android for share mode', async () => {
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);

		const blob = new Blob(['zip'], { type: 'application/zip' });
		const result = await deliverArchive(blob, 'test.yamadori.zip', 'share');

		expect(result).toBe('shared');
		expect(writeFileMock).toHaveBeenCalled();
		expect(shareMock).toHaveBeenCalled();
		expect(saveToDownloadsMock).not.toHaveBeenCalled();
	});

	it('saves to downloads on native android for local mode', async () => {
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);

		const blob = new Blob(['zip'], { type: 'application/zip' });
		const result = await deliverArchive(blob, 'test.yamadori.zip', 'local');

		expect(result).toBe('saved');
		expect(saveToDownloadsMock).toHaveBeenCalledWith(
			expect.objectContaining({
				fileName: 'test.yamadori.zip',
				mimeType: 'application/zip',
				data: 'enA='
			})
		);
		expect(shareMock).not.toHaveBeenCalled();
	});
});
