import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isNativeApp, isAndroidApp } = vi.hoisted(() => ({
	isNativeApp: vi.fn(() => true),
	isAndroidApp: vi.fn(() => true)
}));

const consumePendingImport = vi.hoisted(() => vi.fn());
const clearPendingImport = vi.hoisted(() => vi.fn());
const deletePendingImportFile = vi.hoisted(() => vi.fn());
const inspectIncomingArchiveMock = vi.hoisted(() => vi.fn());
const goto = vi.hoisted(() => vi.fn());

vi.mock('$lib/utils/platform', () => ({ isNativeApp, isAndroidApp }));
vi.mock('@capacitor/core', () => ({
	Capacitor: {
		convertFileSrc: (path: string) => `https://localhost/${path}`
	},
	registerPlugin: vi.fn(() => ({}))
}));
vi.mock('./yamadoriBackupPlugin', () => ({
	YamadoriBackup: {
		consumePendingImport,
		clearPendingImport,
		deletePendingImportFile,
		readPendingImportFile: vi.fn(),
		addListener: vi.fn()
	}
}));
vi.mock('./import', () => ({
	inspectIncomingArchive: (...args: unknown[]) => inspectIncomingArchiveMock(...args)
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));
vi.mock('$lib/paraglide/messages.js', () => ({
	settings_backup_not_found: () => 'not-found',
	tree_share_success: () => 'added'
}));
vi.mock('$lib/stores/appToast.svelte', () => ({
	showErrorToast: vi.fn(),
	showOkToast: vi.fn()
}));

import {
	dismissPendingIncomingBackup,
	incomingBackupState,
	pickUpPendingIncomingArchiveIfNeeded
} from './incomingBackup.svelte';
import {
	incomingTreeShareState,
	resetIncomingTreeShare,
	resumeIncomingArchiveIfNeeded
} from './incomingTreeShare.svelte';

const nativePending = {
	cachePath: '/cache/imports/pending-import.yamadori.zip',
	displayName: 'DOC-20260907-WA0001.zip',
	fileSizeBytes: 2048,
	sha256Prefix: 'deadbeefcafebabe'
};

describe('incoming archive resume', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isNativeApp.mockReturnValue(true);
		isAndroidApp.mockReturnValue(true);
		incomingBackupState.pending = null;
		resetIncomingTreeShare();
		clearPendingImport.mockResolvedValue(undefined);
		deletePendingImportFile.mockResolvedValue(undefined);
		consumePendingImport.mockResolvedValue({});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				blob: async () => new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])])
			})
		);
	});

	it('picks up a native pending import when JS pending is empty', async () => {
		consumePendingImport.mockResolvedValue(nativePending);

		await expect(pickUpPendingIncomingArchiveIfNeeded()).resolves.toBe(true);

		expect(consumePendingImport).toHaveBeenCalledOnce();
		expect(incomingBackupState.pending).toEqual(nativePending);
	});

	it('does not consume again when JS already has a pending import', async () => {
		incomingBackupState.pending = nativePending;

		await expect(pickUpPendingIncomingArchiveIfNeeded()).resolves.toBe(true);

		expect(consumePendingImport).not.toHaveBeenCalled();
	});

	it('inspects the native pending archive on resume', async () => {
		consumePendingImport.mockResolvedValue(nativePending);
		inspectIncomingArchiveMock.mockResolvedValue({
			kind: 'tree-share',
			archive: {
				kind: 'tree-share',
				trees: [{ id: 'tree-1' }]
			}
		});

		await resumeIncomingArchiveIfNeeded({
			base: '',
			getRouteId: () => '/'
		});

		expect(inspectIncomingArchiveMock).toHaveBeenCalledOnce();
		expect(incomingTreeShareState.status).toBe('tree-share');
		expect(goto).not.toHaveBeenCalled();
	});

	it('calls native clearPendingImport when the pending share is dismissed', async () => {
		incomingBackupState.pending = nativePending;

		await dismissPendingIncomingBackup();

		expect(deletePendingImportFile).toHaveBeenCalledWith({
			cachePath: nativePending.cachePath
		});
		expect(clearPendingImport).toHaveBeenCalledOnce();
		expect(incomingBackupState.pending).toBeNull();
	});
});
