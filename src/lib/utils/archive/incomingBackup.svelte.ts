import { Capacitor } from '@capacitor/core';
import * as m from '$lib/paraglide/messages.js';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';
import { YamadoriBackup, type YamadoriBackupPendingImport } from './yamadoriBackupPlugin';

export type IncomingBackupPending = YamadoriBackupPendingImport;

export const incomingBackupState = $state<{ pending: IncomingBackupPending | null }>({
	pending: null
});

function isPendingImport(
	value: Partial<IncomingBackupPending>
): value is IncomingBackupPending {
	return (
		typeof value.cachePath === 'string' &&
		typeof value.displayName === 'string' &&
		typeof value.fileSizeBytes === 'number' &&
		typeof value.sha256Prefix === 'string'
	);
}

async function readBlobFromCachePath(cachePath: string): Promise<Blob> {
	if (isNativeApp()) {
		try {
			const response = await fetch(Capacitor.convertFileSrc(cachePath));
			if (response.ok) {
				return await response.blob();
			}
		} catch {
			// Fall through to plugin read.
		}
	}

	const { base64 } = await YamadoriBackup.readPendingImportFile({ cachePath });
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Blob([bytes], { type: 'application/zip' });
}

export function clearPendingIncomingBackup(): void {
	incomingBackupState.pending = null;
}

export async function deletePendingIncomingBackupFile(): Promise<void> {
	const pending = incomingBackupState.pending;
	if (!pending || !isNativeApp() || !isAndroidApp()) {
		return;
	}

	try {
		await YamadoriBackup.deletePendingImportFile({ cachePath: pending.cachePath });
	} catch {
		// Best-effort cleanup.
	}
}

export async function dismissPendingIncomingBackup(): Promise<void> {
	await deletePendingIncomingBackupFile();
	clearPendingIncomingBackup();
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

	const blob = await readBlobFromCachePath(pending.cachePath);
	return {
		blob,
		displayName: pending.displayName
	};
}

export function formatIncomingBackupSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export function formatIncomingBackupNotFoundError(): string {
	return m.settings_backup_not_found();
}
