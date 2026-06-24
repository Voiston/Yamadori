import { get, set } from 'idb-keyval';
import type { ParkingPosition } from '$lib/types/parking';
import type { Tree } from '$lib/types/tree';
import {
	BACKUP_REMINDER_DISMISS_KEY,
	BACKUP_REMINDER_STORAGE_KEY,
	computeDataFingerprint,
	evaluateBackupWarning,
	type BackupReminderPersisted,
	type BackupWarning
} from './backupReminder';

export {
	BACKUP_REMINDER_STORAGE_KEY,
	computeDataFingerprint,
	evaluateBackupWarning,
	MAX_DAYS_WITHOUT_EXPORT
} from './backupReminder';

export const backupReminderState = $state({
	lastExportAt: null as string | null,
	lastExportFingerprint: null as string | null,
	loaded: false,
	dismissed: false
});

function readDismissedFromSession(): boolean {
	if (typeof sessionStorage === 'undefined') {
		return false;
	}
	return sessionStorage.getItem(BACKUP_REMINDER_DISMISS_KEY) === '1';
}

export async function initBackupReminder(): Promise<void> {
	try {
		const stored = await get<BackupReminderPersisted>(BACKUP_REMINDER_STORAGE_KEY);
		backupReminderState.lastExportAt = stored?.lastExportAt ?? null;
		backupReminderState.lastExportFingerprint = stored?.lastExportFingerprint ?? null;
	} catch (error) {
		console.error('initBackupReminder failed:', error);
		backupReminderState.lastExportAt = null;
		backupReminderState.lastExportFingerprint = null;
	} finally {
		backupReminderState.dismissed = readDismissedFromSession();
		backupReminderState.loaded = true;
	}
}

export async function markBackupExported(
	trees: Tree[],
	parking: ParkingPosition | null
): Promise<void> {
	const fingerprint = computeDataFingerprint(trees, parking);
	const lastExportAt = new Date().toISOString();

	backupReminderState.lastExportAt = lastExportAt;
	backupReminderState.lastExportFingerprint = fingerprint;
	backupReminderState.dismissed = false;

	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(BACKUP_REMINDER_DISMISS_KEY);
	}

	await set(BACKUP_REMINDER_STORAGE_KEY, {
		lastExportAt,
		lastExportFingerprint: fingerprint
	} satisfies BackupReminderPersisted);
}

export function dismissBackupReminderForSession(): void {
	backupReminderState.dismissed = true;
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.setItem(BACKUP_REMINDER_DISMISS_KEY, '1');
	}
}

export function getActiveBackupWarning(
	trees: Tree[],
	parking: ParkingPosition | null
): BackupWarning | null {
	if (!backupReminderState.loaded) {
		return null;
	}

	return evaluateBackupWarning(
		trees,
		parking,
		{
			lastExportAt: backupReminderState.lastExportAt,
			lastExportFingerprint: backupReminderState.lastExportFingerprint
		},
		backupReminderState.dismissed
	);
}
