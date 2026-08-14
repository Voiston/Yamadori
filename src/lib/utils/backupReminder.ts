import * as m from '$lib/paraglide/messages.js';
import type { ParkingPosition } from '$lib/types/parking';
import type { Tree } from '$lib/types/tree';

export const BACKUP_REMINDER_STORAGE_KEY = 'yamadori-backup-reminder';
export const BACKUP_REMINDER_DISMISS_KEY = 'yamadori-backup-reminder-dismissed';
export const MAX_DAYS_WITHOUT_EXPORT = 14;
export const INVENTORY_FINGERPRINT_PREFIX = 'v2:';

export type BackupReminderPersisted = {
	lastExportAt: string | null;
	lastExportFingerprint: string | null;
};

export type BackupWarningReason = 'never' | 'stale' | 'changed';

export type BackupWarning = {
	show: true;
	message: string;
	reason: BackupWarningReason;
};

export function computeTreeInventoryFingerprint(trees: Tree[]): string {
	const ids = trees
		.map((tree) => tree.id)
		.sort()
		.join('|');
	return `${INVENTORY_FINGERPRINT_PREFIX}${trees.length}:${ids}`;
}

function isV2InventoryFingerprint(fingerprint: string | null): fingerprint is string {
	return fingerprint?.startsWith(INVENTORY_FINGERPRINT_PREFIX) ?? false;
}

function daysSince(isoDate: string, now = Date.now()): number {
	const then = Date.parse(isoDate);
	if (Number.isNaN(then)) {
		return MAX_DAYS_WITHOUT_EXPORT;
	}
	return Math.floor((now - then) / (24 * 60 * 60 * 1000));
}

function formatStaleMessage(days: number): string {
	if (days <= 1) {
		return m.backup_stale_1();
	}
	return m.backup_stale_days({ days: String(days) });
}

export function evaluateBackupWarning(
	trees: Tree[],
	_parking: ParkingPosition | null,
	reminder: BackupReminderPersisted,
	dismissed: boolean,
	now = Date.now()
): BackupWarning | null {
	if (dismissed || trees.length === 0) {
		return null;
	}

	const inventoryFingerprint = computeTreeInventoryFingerprint(trees);
	const { lastExportAt, lastExportFingerprint } = reminder;

	if (!lastExportAt) {
		return {
			show: true,
			message: m.backup_advised(),
			reason: 'never'
		};
	}

	if (
		isV2InventoryFingerprint(lastExportFingerprint) &&
		lastExportFingerprint !== inventoryFingerprint
	) {
		return {
			show: true,
			message: m.backup_changed(),
			reason: 'changed'
		};
	}

	const inventoryMatchesForStale =
		!isV2InventoryFingerprint(lastExportFingerprint) ||
		lastExportFingerprint === inventoryFingerprint;

	if (inventoryMatchesForStale) {
		const days = daysSince(lastExportAt, now);
		if (days >= MAX_DAYS_WITHOUT_EXPORT) {
			return {
				show: true,
				message: formatStaleMessage(days),
				reason: 'stale'
			};
		}
	}

	return null;
}
