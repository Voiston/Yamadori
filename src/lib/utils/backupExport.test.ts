import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBuildArchive = vi.fn();
const mockDeliverArchive = vi.fn();
const mockMarkBackupExported = vi.fn();

vi.mock('$lib/utils/archive', () => ({
	buildArchive: (...args: unknown[]) => mockBuildArchive(...args),
	deliverArchive: (...args: unknown[]) => mockDeliverArchive(...args),
	archiveFilename: () => 'test.yamadori.zip'
}));

vi.mock('$lib/utils/backupReminder.svelte', () => ({
	markBackupExported: (...args: unknown[]) => mockMarkBackupExported(...args)
}));

vi.mock('$lib/utils/nativeInit', () => ({
	getAppVersionLabel: vi.fn().mockResolvedValue('0.6.4')
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
	initTrees: vi.fn()
}));

vi.mock('$lib/stores/parking.svelte', () => ({
	parkingStore: { loaded: true, position: null },
	initParking: vi.fn()
}));

vi.mock('$lib/stores/apiSettings.svelte', () => ({
	getApiSettingsSnapshot: () => ({}),
	initApiSettings: vi.fn()
}));

import { exportAppBackup } from './backupExport';

describe('exportAppBackup', () => {
	beforeEach(() => {
		mockBuildArchive.mockReset();
		mockDeliverArchive.mockReset();
		mockMarkBackupExported.mockReset();
		mockBuildArchive.mockResolvedValue(new Blob(['zip']));
		mockDeliverArchive.mockResolvedValue('shared');
		mockMarkBackupExported.mockResolvedValue(undefined);
	});

	it('builds, delivers and marks backup exported', async () => {
		const result = await exportAppBackup('share', { password: 'secret-pass' });
		expect(mockBuildArchive).toHaveBeenCalledWith(
			expect.objectContaining({ trees: [{ id: 'tree-1' }] }),
			{ password: 'secret-pass' }
		);
		expect(mockDeliverArchive).toHaveBeenCalledWith(
			expect.any(Blob),
			'test.yamadori.zip',
			'share'
		);
		expect(mockMarkBackupExported).toHaveBeenCalled();
		expect(result).toBe('shared');
	});
});
