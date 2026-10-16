import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBuildArchive = vi.fn();
const mockDeliverArchive = vi.fn();
const mockFlushTreesPersist = vi.fn();
const mockHydrateTreeMedia = vi.fn();
const mockInitTrees = vi.fn();
const mockMergeTreesFromBackup = vi.fn();
const mockGetTreeById = vi.fn();

const hydratedTree = {
	id: '00000000-0000-4000-8000-000000000001',
	species: 'Érable',
	photos: ['data:image/png;base64,AAA'],
	visits: [{ id: 'v1', photos: ['data:image/png;base64,AAA'] }]
};

vi.mock('$lib/utils/archive', () => ({
	buildArchive: (...args: unknown[]) => mockBuildArchive(...args),
	deliverArchive: (...args: unknown[]) => mockDeliverArchive(...args),
	treeShareFilename: () => 'yamadori-arbre-erable-2026-09-07.yamadori.zip'
}));

vi.mock('$lib/utils/nativeInit', () => ({
	getAppVersionLabel: vi.fn().mockResolvedValue('1.0.5')
}));

vi.mock('$lib/stores/trees.svelte', () => ({
	treeStore: { loaded: true, trees: [] },
	initTrees: (...args: unknown[]) => mockInitTrees(...args),
	flushTreesPersist: (...args: unknown[]) => mockFlushTreesPersist(...args),
	mergeTreesFromBackup: (...args: unknown[]) => mockMergeTreesFromBackup(...args),
	getTreeById: (...args: unknown[]) => mockGetTreeById(...args)
}));

vi.mock('$lib/utils/tree-storage/repository', () => ({
	hydrateTreeMedia: (...args: unknown[]) => mockHydrateTreeMedia(...args)
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	tree_share_not_found: () => 'not-found',
	tree_share_dialog_title: () => 'send-title',
	settings_export_share_canceled: () => 'share-canceled',
	settings_backup_export_missing_photos_warning: ({ count }: { count: string }) =>
		`blocked:${count}`
}));

import { treeStore } from '$lib/stores/trees.svelte';
import type { Tree } from '$lib/types/tree';
import { IncompleteBackupExportError } from './backupExport';
import {
	applyIncomingTreeShare,
	exportTreeShare,
	isTreeShareArchive,
	TreeShareNotFoundError
} from './treeShare';

describe('exportTreeShare', () => {
	beforeEach(() => {
		treeStore.loaded = true;
		mockBuildArchive.mockReset().mockResolvedValue(new Blob(['zip']));
		mockDeliverArchive.mockReset().mockResolvedValue('shared');
		mockFlushTreesPersist.mockReset().mockResolvedValue(undefined);
		mockHydrateTreeMedia.mockReset().mockResolvedValue(hydratedTree);
		mockInitTrees.mockReset().mockResolvedValue(undefined);
		mockMergeTreesFromBackup.mockReset().mockResolvedValue(undefined);
		mockGetTreeById.mockReset().mockReturnValue(hydratedTree);
	});

	it('builds a tree-share archive and delivers it', async () => {
		const result = await exportTreeShare(hydratedTree.id);

		expect(result).toBe('shared');
		expect(mockInitTrees).not.toHaveBeenCalled();
		expect(mockFlushTreesPersist).toHaveBeenCalled();
		expect(mockBuildArchive).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: 'tree-share',
				trees: [hydratedTree],
				parking: null,
				appVersion: '1.0.5'
			})
		);
		expect(mockDeliverArchive).toHaveBeenCalledWith(
			expect.any(Blob),
			'yamadori-arbre-erable-2026-09-07.yamadori.zip',
			'share',
			{ shareTitle: 'send-title' }
		);
	});

	it('loads the notebook before sharing when it is not ready', async () => {
		treeStore.loaded = false;

		await exportTreeShare(hydratedTree.id);

		expect(mockInitTrees).toHaveBeenCalled();
	});

	it('throws when the tree cannot be hydrated', async () => {
		mockHydrateTreeMedia.mockResolvedValue(null);

		await expect(exportTreeShare('missing')).rejects.toBeInstanceOf(TreeShareNotFoundError);
		expect(mockBuildArchive).not.toHaveBeenCalled();
	});

	it('refuses to share a tree whose photos did not hydrate', async () => {
		mockHydrateTreeMedia.mockResolvedValue({
			...hydratedTree,
			visits: [{ id: 'v1', photos: [''], photoThumbs: ['thumb'] }]
		});

		await expect(exportTreeShare(hydratedTree.id)).rejects.toBeInstanceOf(
			IncompleteBackupExportError
		);
		expect(mockDeliverArchive).not.toHaveBeenCalled();
	});

	it('returns canceled when the share sheet is dismissed', async () => {
		mockDeliverArchive.mockRejectedValue(new Error('share-canceled'));

		await expect(exportTreeShare(hydratedTree.id)).resolves.toBe('canceled');
	});
});

describe('applyIncomingTreeShare', () => {
	beforeEach(() => {
		treeStore.loaded = true;
		mockInitTrees.mockReset().mockResolvedValue(undefined);
		mockMergeTreesFromBackup.mockReset().mockResolvedValue(undefined);
		mockGetTreeById.mockReset().mockReturnValue(hydratedTree);
	});

	it('merges a received tree with no free-tier lock', async () => {
		const incoming = { ...hydratedTree, id: 'incoming-tree' } as Tree;
		mockGetTreeById.mockReturnValue(incoming);

		const saved = await applyIncomingTreeShare(incoming);

		expect(mockMergeTreesFromBackup).toHaveBeenCalledWith([incoming]);
		expect(saved).toBe(incoming);
		expect(mockInitTrees).not.toHaveBeenCalled();
	});
});

describe('isTreeShareArchive', () => {
	it('detects kind on the archive and preview', () => {
		expect(isTreeShareArchive({ kind: 'tree-share' })).toBe(true);
		expect(isTreeShareArchive({ preview: { kind: 'tree-share' } })).toBe(true);
		expect(isTreeShareArchive({ kind: 'backup' })).toBe(false);
	});
});
