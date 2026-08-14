import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBuildArchive = vi.fn();
const mockDeliverArchive = vi.fn();
const mockMarkBackupExported = vi.fn();
const mockFlushTreesPersist = vi.fn();
const mockLoadTreesFromStorage = vi.fn();

const fullTrees = [
	{
		id: 'tree-1',
		photos: ['data:image/png;base64,AAA'],
		visits: [{ id: 'v1', photos: ['data:image/png;base64,AAA'] }]
	}
];

const incompleteTrees = [
	{
		id: 'tree-missing',
		photos: [''],
		visits: [
			{
				id: 'v1',
				photos: [''],
				photoThumbs: ['data:image/png;base64,thumb']
			}
		]
	}
];

vi.mock('$lib/utils/archive', () => ({
	buildArchive: (...args: unknown[]) => mockBuildArchive(...args),
	deliverArchive: (...args: unknown[]) => mockDeliverArchive(...args),
	archiveFilename: () => 'test.yamadori.zip'
}));

vi.mock('$lib/utils/backupReminder.svelte', () => ({
	markBackupExported: (...args: unknown[]) => mockMarkBackupExported(...args)
}));

vi.mock('$lib/utils/nativeInit', () => ({
	getAppVersionLabel: vi.fn().mockResolvedValue('0.7.8')
}));

vi.mock('$lib/stores/appearanceSettings.svelte', () => ({
	appearanceSettingsState: {
		loaded: true,
		outdoorMode: false,
		darkMode: false,
		simpleMode: false,
		locale: 'fr'
	},
	initAppearanceSettings: vi.fn()
}));

vi.mock('$lib/stores/trees.svelte', () => ({
	treeStore: { loaded: true, trees: [{ id: 'tree-1' }] },
	initTrees: vi.fn(),
	flushTreesPersist: (...args: unknown[]) => mockFlushTreesPersist(...args)
}));

vi.mock('$lib/utils/tree-storage/repository', () => ({
	loadTreesFromStorage: (...args: unknown[]) => mockLoadTreesFromStorage(...args)
}));

vi.mock('$lib/stores/parking.svelte', () => ({
	parkingStore: { loaded: true, position: null },
	initParking: vi.fn()
}));

vi.mock('$lib/stores/apiSettings.svelte', () => ({
	getApiSettingsSnapshot: () => ({}),
	initApiSettings: vi.fn()
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	settings_backup_export_missing_photos_warning: ({ count }: { count: string }) =>
		`blocked:${count}`
}));

import { exportAppBackup, IncompleteBackupExportError } from './backupExport';

describe('exportAppBackup', () => {
	beforeEach(() => {
		mockBuildArchive.mockReset();
		mockDeliverArchive.mockReset();
		mockMarkBackupExported.mockReset();
		mockFlushTreesPersist.mockReset();
		mockLoadTreesFromStorage.mockReset();
		mockBuildArchive.mockResolvedValue(new Blob(['zip']));
		mockDeliverArchive.mockResolvedValue('shared');
		mockMarkBackupExported.mockResolvedValue(undefined);
		mockFlushTreesPersist.mockResolvedValue(undefined);
		mockLoadTreesFromStorage.mockResolvedValue(fullTrees);
	});

	it('builds, delivers and marks backup exported', async () => {
		const result = await exportAppBackup('share', { password: 'secret-pass' });
		expect(mockBuildArchive).toHaveBeenCalledWith(
			expect.objectContaining({ trees: fullTrees }),
			{ password: 'secret-pass' }
		);
		expect(mockDeliverArchive).toHaveBeenCalledWith(
			expect.any(Blob),
			'test.yamadori.zip',
			'share'
		);
		expect(mockMarkBackupExported).toHaveBeenCalled();
		expect(result.delivery).toBe('shared');
		expect(result.missingPhotoTrees).toBe(0);
	});

	it('flushes pending writes then loads full trees for the archive', async () => {
		const callOrder: string[] = [];
		mockFlushTreesPersist.mockImplementation(async () => {
			callOrder.push('flush');
		});
		mockLoadTreesFromStorage.mockImplementation(async (level: string) => {
			callOrder.push(`load:${level}`);
			return fullTrees;
		});

		await exportAppBackup('local');

		expect(callOrder).toEqual(['flush', 'load:full']);
		expect(mockBuildArchive).toHaveBeenCalledWith(
			expect.objectContaining({ trees: fullTrees }),
			expect.anything()
		);
		expect(mockMarkBackupExported).toHaveBeenCalledWith([{ id: 'tree-1' }], null);
	});

	it('refuses export when full load leaves empty photo slots', async () => {
		mockLoadTreesFromStorage.mockResolvedValue(incompleteTrees);

		await expect(exportAppBackup('share')).rejects.toBeInstanceOf(IncompleteBackupExportError);
		expect(mockBuildArchive).not.toHaveBeenCalled();
		expect(mockDeliverArchive).not.toHaveBeenCalled();
	});
});
