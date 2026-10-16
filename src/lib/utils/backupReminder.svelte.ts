import { secureIdbGet, secureIdbSet } from '$lib/utils/secure-idb';
import type { ParkingPosition } from '$lib/types/parking';
import type { Tree } from '$lib/types/tree';
import {
	BACKUP_REMINDER_STORAGE_KEY,
	DISMISS_MS,
	computeTreeInventoryFingerprint,
	evaluateBackupWarning,
	type BackupReminderPersisted,
	type BackupWarning,
	type BackupWarningReason
} from './backupReminder';
import { syncBackupReminderNotification } from './backupNotifications';

export {
	BACKUP_REMINDER_STORAGE_KEY,
	DISMISS_MS,
	computeTreeInventoryFingerprint,
	evaluateBackupWarning,
	MAX_DAYS_WITHOUT_EXPORT,
	shouldShowBackupHomeCard
} from './backupReminder';

export const backupReminderState = $state({
	lastExportAt: null as string | null,
	lastExportFingerprint: null as string | null,
	dismissedUntil: null as string | null,
	dismissedReason: null as BackupWarningReason | null,
	loaded: false
});

function reminderSnapshot(): BackupReminderPersisted {
	return {
		lastExportAt: backupReminderState.lastExportAt,
		lastExportFingerprint: backupReminderState.lastExportFingerprint,
		dismissedUntil: backupReminderState.dismissedUntil,
		dismissedReason: backupReminderState.dismissedReason
	};
}

async function persistReminder(): Promise<void> {
	await secureIdbSet(BACKUP_REMINDER_STORAGE_KEY, reminderSnapshot());
}

export async function initBackupReminder(): Promise<void> {
	try {
		const stored = await secureIdbGet<BackupReminderPersisted>(BACKUP_REMINDER_STORAGE_KEY);
		backupReminderState.lastExportAt = stored?.lastExportAt ?? null;
		backupReminderState.lastExportFingerprint = stored?.lastExportFingerprint ?? null;
		backupReminderState.dismissedUntil = stored?.dismissedUntil ?? null;
		backupReminderState.dismissedReason = stored?.dismissedReason ?? null;
	} catch (error) {
		console.error('initBackupReminder failed:', error);
		backupReminderState.lastExportAt = null;
		backupReminderState.lastExportFingerprint = null;
		backupReminderState.dismissedUntil = null;
		backupReminderState.dismissedReason = null;
	} finally {
		backupReminderState.loaded = true;
	}
}

export async function markBackupExported(
	trees: Tree[],
	_parking: ParkingPosition | null
): Promise<void> {
	const fingerprint = computeTreeInventoryFingerprint(trees);
	const lastExportAt = new Date().toISOString();

	backupReminderState.lastExportAt = lastExportAt;
	backupReminderState.lastExportFingerprint = fingerprint;
	backupReminderState.dismissedUntil = null;
	backupReminderState.dismissedReason = null;

	await persistReminder();
	void syncBackupReminderNotification(trees, { lastExportAt });
}

export async function dismissBackupReminder(
	reason: BackupWarningReason,
	now = Date.now()
): Promise<void> {
	backupReminderState.dismissedUntil = new Date(now + DISMISS_MS).toISOString();
	backupReminderState.dismissedReason = reason;
	await persistReminder();
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
		{
			dismissedUntil: backupReminderState.dismissedUntil,
			dismissedReason: backupReminderState.dismissedReason
		}
	);
}
