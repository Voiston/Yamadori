import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import * as m from '$lib/paraglide/messages.js';
import type { RebuiltArchive } from './types';
import { ArchiveError } from './types';
import { inspectIncomingArchive } from './import';
import {
	dismissPendingIncomingBackup,
	incomingBackupState,
	pickUpPendingIncomingArchiveIfNeeded,
	readPendingBackupBlob
} from './incomingBackup.svelte';
import { applyIncomingTreeShare, isTreeShareArchive } from '$lib/utils/treeShare';
import { showErrorToast, showOkToast } from '$lib/stores/appToast.svelte';
import { resolveErrorCopy } from '$lib/utils/userFacingError';
import { settingsRestoreFailedCopy } from '$lib/utils/errorCopy';

export type IncomingInspectStatus = 'idle' | 'inspecting' | 'tree-share' | 'backup' | 'error';

export const incomingTreeShareState = $state<{
	status: IncomingInspectStatus;
	archive: RebuiltArchive | null;
	adding: boolean;
}>({
	status: 'idle',
	archive: null,
	adding: false
});

export function presentTreeShare(archive: RebuiltArchive): void {
	incomingTreeShareState.archive = archive;
	incomingTreeShareState.status = 'tree-share';
	incomingTreeShareState.adding = false;
}

export function resetIncomingTreeShare(): void {
	incomingTreeShareState.status = 'idle';
	incomingTreeShareState.archive = null;
	incomingTreeShareState.adding = false;
}

export async function inspectPendingIncomingArchive(): Promise<'tree-share' | 'backup' | 'idle'> {
	if (incomingTreeShareState.status === 'tree-share') {
		return 'tree-share';
	}
	if (incomingTreeShareState.status === 'inspecting') {
		return 'idle';
	}

	if (!incomingBackupState.pending) {
		resetIncomingTreeShare();
		return 'idle';
	}

	incomingTreeShareState.status = 'inspecting';
	incomingTreeShareState.archive = null;

	try {
		const pending = await readPendingBackupBlob();
		if (!pending) {
			incomingTreeShareState.status = 'backup';
			return 'backup';
		}

		const inspection = await inspectIncomingArchive(pending.blob);
		if (inspection.kind === 'tree-share' && inspection.archive && isTreeShareArchive(inspection.archive)) {
			presentTreeShare(inspection.archive);
			return 'tree-share';
		}

		incomingTreeShareState.status = 'backup';
		return 'backup';
	} catch (error) {
		if (error instanceof ArchiveError && error.code === 'ARCHIVE_PASSWORD_REQUIRED') {
			incomingTreeShareState.status = 'backup';
			return 'backup';
		}
		incomingTreeShareState.status = 'error';
		showErrorToast(resolveErrorCopy(error, settingsRestoreFailedCopy()));
		return 'backup';
	}
}

export async function handleIncomingArchiveReady(options: {
	base: string;
	getRouteId: () => string | null;
}): Promise<void> {
	const kind = await inspectPendingIncomingArchive();
	if (kind !== 'backup') {
		return;
	}
	if (options.getRouteId() !== '/settings') {
		await goto(`${options.base}/settings`);
	}
}

export async function resumeIncomingArchiveIfNeeded(options: {
	base: string;
	getRouteId: () => string | null;
}): Promise<void> {
	const hasPending = await pickUpPendingIncomingArchiveIfNeeded();
	if (!hasPending) {
		return;
	}
	await handleIncomingArchiveReady(options);
}

export async function confirmIncomingTreeShare(): Promise<string | null> {
	const archive = incomingTreeShareState.archive;
	const tree = archive?.trees[0];
	if (!tree) {
		return null;
	}

	incomingTreeShareState.adding = true;
	try {
		const saved = await applyIncomingTreeShare(tree);
		await dismissPendingIncomingBackup();
		resetIncomingTreeShare();
		showOkToast(m.tree_share_success());
		await goto(resolve('/tree/[id]', { id: saved.id }));
		return saved.id;
	} catch (error) {
		showErrorToast(resolveErrorCopy(error, settingsRestoreFailedCopy()));
		return null;
	} finally {
		incomingTreeShareState.adding = false;
	}
}

export async function cancelIncomingTreeShare(): Promise<void> {
	await dismissPendingIncomingBackup();
	resetIncomingTreeShare();
}
