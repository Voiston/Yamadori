import * as m from '$lib/paraglide/messages.js';
import { Filesystem } from '@capacitor/filesystem';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import { YamadoriBackup, type YamadoriBackupPendingImport } from './yamadoriBackupPlugin';

export type IncomingBackupPending = YamadoriBackupPendingImport;

export const incomingBackupState = $state<{ pending: IncomingBackupPending | null }>({
	pending: null
});

function isPendingImport(
	value: Partial<IncomingBackupPending>
): value is IncomingBackupPending {
	return typeof value.cachePath === 'string' && typeof value.displayName === 'string';
}

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

export function clearPendingIncomingBackup(): void {
	incomingBackupState.pending = null;
}

export function setPendingIncomingBackup(pending: IncomingBackupPending): void {
	incomingBackupState.pending = pending;
}

export async function consumePendingIncomingBackup(): Promise<IncomingBackupPending | null> {
	if (!isNativeApp() || !isAndroidApp()) {
		return null;
	}

	const pending = await YamadoriBackup.consumePendingImport();
	if (!isPendingImport(pending)) {
		return null;
	}

	setPendingIncomingBackup(pending);
	return pending;
}

export async function readPendingBackupBlob(): Promise<{
	blob: Blob;
	displayName: string;
} | null> {
	const pending = incomingBackupState.pending;
	if (!pending) {
		return null;
	}

	const result = await Filesystem.readFile({ path: pending.cachePath });
	if (typeof result.data !== 'string') {
		throw new Error(m.error_incoming_backup_read());
	}
	const bytes = base64ToBytes(result.data);
	return {
		blob: new Blob([Uint8Array.from(bytes)], { type: 'application/zip' }),
		displayName: pending.displayName
	};
}

export async function initIncomingBackupListener(onReady: () => void): Promise<() => void> {
	if (!isNativeApp() || !isAndroidApp()) {
		return () => {};
	}

	const applyPending = (pending: Partial<IncomingBackupPending>) => {
		if (!isPendingImport(pending)) {
			return;
		}
		setPendingIncomingBackup(pending);
		onReady();
	};

	const existing = await consumePendingIncomingBackup();
	if (existing) {
		onReady();
	}

	const listener = await YamadoriBackup.addListener('backupImportReady', applyPending);

	return () => {
		void listener.remove();
	};
}
