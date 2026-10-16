import * as m from '$lib/paraglide/messages.js';
import { isAndroidApp } from '$lib/utils/platform';
import { hasNotificationPermission } from '$lib/utils/permissions';
import { backupNotificationAt, type BackupReminderPersisted } from '$lib/utils/backupReminder';
import type { Tree } from '$lib/types/tree';

export const BACKUP_CHANNEL_ID = 'backup_v1';
/** Stable id outside typical tree-hash range collision concern; dedicated backup slot. */
export const BACKUP_NOTIFICATION_ID = 0x59414d42;
export const BACKUP_NOTIFICATION_EXTRA = 'backup';

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications').LocalNotifications;

async function nativeNotifications(): Promise<LocalNotificationsPlugin | null> {
	if (!isAndroidApp()) return null;
	try {
		const { LocalNotifications } = await import('@capacitor/local-notifications');
		return LocalNotifications;
	} catch (error) {
		console.error('local-notifications plugin unavailable:', error);
		return null;
	}
}

async function ensureChannel(plugin: LocalNotificationsPlugin): Promise<void> {
	await plugin.createChannel({
		id: BACKUP_CHANNEL_ID,
		name: m.backup_channel_name(),
		description: m.backup_channel_description(),
		importance: 3,
		visibility: 1,
		vibration: false
	});
}

async function cancelBackupNotification(plugin: LocalNotificationsPlugin): Promise<void> {
	await plugin.cancel({ notifications: [{ id: BACKUP_NOTIFICATION_ID }] });
}

export async function syncBackupReminderNotification(
	trees: Tree[],
	reminder: Pick<BackupReminderPersisted, 'lastExportAt'>,
	now = Date.now()
): Promise<'scheduled' | 'canceled' | 'skipped'> {
	const plugin = await nativeNotifications();
	if (!plugin) return 'skipped';

	const granted = await hasNotificationPermission();
	if (!granted) {
		try {
			await cancelBackupNotification(plugin);
		} catch {
			/* ignore */
		}
		return 'skipped';
	}

	const at = backupNotificationAt(trees, reminder, now);

	try {
		await ensureChannel(plugin);
		await cancelBackupNotification(plugin);
		if (!at) {
			return 'canceled';
		}

		const notification: {
			id: number;
			title: string;
			body: string;
			channelId: string;
			extra: { yamadori: string };
			schedule: { at: Date; allowWhileIdle: true; isExactNotification: boolean };
		} = {
			id: BACKUP_NOTIFICATION_ID,
			title: m.backup_notification_title(),
			body: m.backup_notification_body(),
			channelId: BACKUP_CHANNEL_ID,
			extra: { yamadori: BACKUP_NOTIFICATION_EXTRA },
			schedule: {
				at,
				allowWhileIdle: true,
				isExactNotification: false
			}
		};
		await plugin.schedule({ notifications: [notification] });
		return 'scheduled';
	} catch (error) {
		console.error('syncBackupReminderNotification failed:', error);
		return 'skipped';
	}
}

export function isBackupNotificationTap(extra: unknown): boolean {
	if (!extra || typeof extra !== 'object') return false;
	return (extra as { yamadori?: unknown }).yamadori === BACKUP_NOTIFICATION_EXTRA;
}

export async function listenBackupNotificationTaps(onBackup: () => void): Promise<() => void> {
	const plugin = await nativeNotifications();
	if (!plugin) return () => {};

	const handle = await plugin.addListener('localNotificationActionPerformed', (event) => {
		if (isBackupNotificationTap(event.notification.extra)) {
			onBackup();
		}
	});

	return () => {
		void handle.remove();
	};
}
