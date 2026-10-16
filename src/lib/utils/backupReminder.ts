import * as m from '$lib/paraglide/messages.js';
import type { ParkingPosition } from '$lib/types/parking';
import type { Tree } from '$lib/types/tree';

export const BACKUP_REMINDER_STORAGE_KEY = 'yamadori-backup-reminder';
export const MAX_DAYS_WITHOUT_EXPORT = 14;
export const DISMISS_MS = 24 * 60 * 60 * 1000;
export const INVENTORY_FINGERPRINT_PREFIX = 'v3:';
export const LEGACY_V2_INVENTORY_FINGERPRINT_PREFIX = 'v2:';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type BackupReminderPersisted = {
	lastExportAt: string | null;
	lastExportFingerprint: string | null;
	dismissedUntil?: string | null;
	dismissedReason?: BackupWarningReason | null;
};

export type BackupReminderDismiss = {
	dismissedUntil: string | null;
	dismissedReason: BackupWarningReason | null;
};

export const EMPTY_BACKUP_DISMISS: BackupReminderDismiss = {
	dismissedUntil: null,
	dismissedReason: null
};

export type BackupWarningReason = 'never' | 'stale' | 'changed';

export type BackupWarning = {
	show: true;
	message: string;
	why: string;
	reason: BackupWarningReason;
};

export function computeTreeInventoryFingerprint(trees: Tree[]): string {
	const parts = trees
		.map((tree) => `${tree.id}:${tree.visits.length}`)
		.sort()
		.join('|');
	return `${INVENTORY_FINGERPRINT_PREFIX}${trees.length}:${parts}`;
}

export function isTrackedInventoryFingerprint(
	fingerprint: string | null
): fingerprint is string {
	return (
		fingerprint?.startsWith(INVENTORY_FINGERPRINT_PREFIX) === true ||
		fingerprint?.startsWith(LEGACY_V2_INVENTORY_FINGERPRINT_PREFIX) === true
	);
}

/** One tree, initial capture only — typical after onboarding « Plus tard ». */
export function isTestNotebook(trees: Tree[]): boolean {
	if (trees.length !== 1) return false;
	return trees[0]!.visits.length <= 1;
}

export function shouldShowBackupHomeCard(warning: BackupWarning | null): boolean {
	return warning?.reason === 'never' || warning?.reason === 'stale';
}

export function daysSince(isoDate: string, now = Date.now()): number {
	const then = Date.parse(isoDate);
	if (Number.isNaN(then)) {
		return MAX_DAYS_WITHOUT_EXPORT;
	}
	return Math.floor((now - then) / MS_PER_DAY);
}

export function isBackupWarningDismissed(
	dismiss: BackupReminderDismiss,
	reason: BackupWarningReason,
	now = Date.now()
): boolean {
	if (!dismiss.dismissedUntil || dismiss.dismissedReason !== reason) {
		return false;
	}
	const until = Date.parse(dismiss.dismissedUntil);
	return !Number.isNaN(until) && now < until;
}

function formatStaleMessage(days: number): string {
	if (days <= 1) {
		return m.backup_stale_1();
	}
	return m.backup_stale_days({ days: String(days) });
}

function nudgeWhy(): string {
	return m.backup_nudge_why();
}

function warningFor(
	reason: BackupWarningReason,
	message: string
): BackupWarning {
	return { show: true, reason, message, why: nudgeWhy() };
}

function resolveBackupWarningReason(
	trees: Tree[],
	reminder: BackupReminderPersisted,
	now: number
): { reason: BackupWarningReason; message: string } | null {
	if (trees.length === 0) {
		return null;
	}

	const { lastExportAt, lastExportFingerprint } = reminder;

	if (!lastExportAt) {
		if (trees.length >= 2) {
			return { reason: 'never', message: m.backup_advised() };
		}

		const tree = trees[0]!;
		if (tree.visits.length > 1) {
			return { reason: 'changed', message: m.backup_changed() };
		}

		const days = daysSince(tree.capturedAt, now);
		if (days >= MAX_DAYS_WITHOUT_EXPORT) {
			return {
				reason: 'stale',
				message: m.backup_stale_no_export_days({ days: String(days) })
			};
		}

		return null;
	}

	const inventoryFingerprint = computeTreeInventoryFingerprint(trees);
	if (
		isTrackedInventoryFingerprint(lastExportFingerprint) &&
		lastExportFingerprint !== inventoryFingerprint
	) {
		return { reason: 'changed', message: m.backup_changed() };
	}

	const inventoryMatchesForStale =
		!isTrackedInventoryFingerprint(lastExportFingerprint) ||
		lastExportFingerprint === inventoryFingerprint;

	if (inventoryMatchesForStale) {
		const days = daysSince(lastExportAt, now);
		if (days >= MAX_DAYS_WITHOUT_EXPORT) {
			return { reason: 'stale', message: formatStaleMessage(days) };
		}
	}

	return null;
}

export function evaluateBackupWarning(
	trees: Tree[],
	_parking: ParkingPosition | null,
	reminder: BackupReminderPersisted,
	dismiss: BackupReminderDismiss = EMPTY_BACKUP_DISMISS,
	now = Date.now()
): BackupWarning | null {
	const resolved = resolveBackupWarningReason(trees, reminder, now);
	if (!resolved) {
		return null;
	}
	if (isBackupWarningDismissed(dismiss, resolved.reason, now)) {
		return null;
	}
	return warningFor(resolved.reason, resolved.message);
}

/** Instant the notebook left the « salon test » state, or null. */
export function notebookBecameRealAt(trees: Tree[]): string | null {
	if (trees.length >= 2) {
		const times = trees
			.map((tree) => Date.parse(tree.capturedAt))
			.filter((value) => !Number.isNaN(value))
			.sort((a, b) => a - b);
		const second = times[1];
		return second === undefined ? null : new Date(second).toISOString();
	}

	if (trees.length === 1 && trees[0]!.visits.length > 1) {
		const times = trees[0]!.visits
			.map((visit) => Date.parse(visit.visitedAt))
			.filter((value) => !Number.isNaN(value))
			.sort((a, b) => a - b);
		const second = times[1];
		return second === undefined ? null : new Date(second).toISOString();
	}

	return null;
}

/** Future local-notification time, or null if none should be scheduled. */
export function backupNotificationAt(
	trees: Tree[],
	reminder: Pick<BackupReminderPersisted, 'lastExportAt'>,
	now = Date.now()
): Date | null {
	const horizonMs = MAX_DAYS_WITHOUT_EXPORT * MS_PER_DAY;

	if (reminder.lastExportAt) {
		const exported = Date.parse(reminder.lastExportAt);
		if (Number.isNaN(exported)) return null;
		const at = exported + horizonMs;
		return at > now ? new Date(at) : null;
	}

	const realAt = notebookBecameRealAt(trees);
	if (!realAt) return null;
	const becameReal = Date.parse(realAt);
	if (Number.isNaN(becameReal)) return null;
	const at = becameReal + horizonMs;
	return at > now ? new Date(at) : null;
}
