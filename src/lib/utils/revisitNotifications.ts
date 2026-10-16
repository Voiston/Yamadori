import { harvestWindowNotifyPlan } from '$lib/geo/harvestWindowPrior';
import * as m from '$lib/paraglide/messages.js';
import { requestNotificationPermission } from '$lib/utils/permissions';
import { isAndroidApp } from '$lib/utils/platform';
import {
	notificationIdForTree,
	parseIsoDate,
	revisitAtLocalEight,
	type RevisitNotifyKind
} from '$lib/utils/revisit';
import { earliestWindowNotifyAt } from '$lib/utils/weekWindow';

/** New id so Android 8+ applies heads-up + sound (channel settings are sticky). */
export const REVISIT_CHANNEL_ID = 'revisite_v2';

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications').LocalNotifications;

export type ScheduleNotifyOptions = {
	/** When true, Capacitor may prompt for exact alarms. Boot/resume must stay false. */
	interactive?: boolean;
	/** `nextRevisitAt` already delivered; skip catch-up for that date. */
	alreadySentFor?: string | null;
	/** First future YRS OPTIMAL/ACCEPTABLE 08:00 from the 7-day forecast. */
	yrsAt?: Date | null;
};

export type ScheduleDateResult = 'scheduled' | 'scheduled-inexact' | 'fired' | 'skipped';

export type ScheduleWindowResult = 'fired' | 'scheduled' | 'scheduled-inexact' | 'unavailable';

type HarvestWindowTree = {
	id: string;
	species: string;
	latitude: number | null;
	longitude: number | null;
};

function exactAlarmGranted(result: unknown): boolean {
	if (!result || typeof result !== 'object') return false;
	return (result as { exact_alarm?: string }).exact_alarm === 'granted';
}

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
		id: REVISIT_CHANNEL_ID,
		name: m.revisit_channel_name(),
		description: m.revisit_channel_description(),
		importance: 4,
		visibility: 1,
		vibration: true
	});
}

async function exactAlarmIsGranted(plugin: LocalNotificationsPlugin): Promise<boolean> {
	try {
		const setting = await plugin.checkExactNotificationSetting();
		return exactAlarmGranted(setting);
	} catch (error) {
		console.error('checkExactNotificationSetting failed:', error);
		return false;
	}
}

/** Opens Android Alarms & reminders when exact alarms are off. Boot/resume must not call this. */
export async function ensureExactAlarmSetting(): Promise<boolean> {
	const plugin = await nativeNotifications();
	if (!plugin) return true;
	if (await exactAlarmIsGranted(plugin)) return true;
	try {
		const after = await plugin.changeExactNotificationSetting();
		return exactAlarmGranted(after);
	} catch (error) {
		console.error('changeExactNotificationSetting failed:', error);
		return false;
	}
}

function scheduledResult(exact: boolean): 'scheduled' | 'scheduled-inexact' {
	return exact ? 'scheduled' : 'scheduled-inexact';
}

async function presentNotification(
	plugin: LocalNotificationsPlugin,
	input: {
		treeId: string;
		kind: RevisitNotifyKind;
		title: string;
		body: string;
		/** Omit to show immediately (no AlarmManager). */
		at?: Date;
		/** When `at` is set, whether to request an exact alarm. Defaults to a live OS check. */
		exact?: boolean;
	}
): Promise<void> {
	await ensureChannel(plugin);
	const notification: {
		id: number;
		title: string;
		body: string;
		channelId: string;
		extra: { treeId: string; kind: RevisitNotifyKind };
		schedule?: { at: Date; allowWhileIdle: true; isExactNotification: boolean };
	} = {
		id: notificationIdForTree(input.treeId, input.kind),
		title: input.title,
		body: input.body,
		channelId: REVISIT_CHANNEL_ID,
		extra: { treeId: input.treeId, kind: input.kind }
	};
	if (input.at) {
		notification.schedule = {
			at: input.at,
			allowWhileIdle: true,
			isExactNotification: input.exact ?? (await exactAlarmIsGranted(plugin))
		};
	}
	await plugin.schedule({ notifications: [notification] });
}

export async function requestRevisitNotificationPermission(): Promise<boolean> {
	return requestNotificationPermission();
}

async function cancelNotification(
	plugin: LocalNotificationsPlugin,
	treeId: string,
	kind: RevisitNotifyKind
): Promise<void> {
	await plugin.cancel({ notifications: [{ id: notificationIdForTree(treeId, kind) }] });
}

export async function cancelRevisitDateNotification(treeId: string): Promise<void> {
	const plugin = await nativeNotifications();
	if (!plugin) return;
	try {
		await cancelNotification(plugin, treeId, 'date');
	} catch (error) {
		console.error('cancelRevisitDateNotification failed:', error);
	}
}

export async function cancelHarvestWindowNotification(treeId: string): Promise<void> {
	const plugin = await nativeNotifications();
	if (!plugin) return;
	try {
		await cancelNotification(plugin, treeId, 'window');
	} catch (error) {
		console.error('cancelHarvestWindowNotification failed:', error);
	}
}

export async function cancelAllRevisitNotificationsForTree(treeId: string): Promise<void> {
	const plugin = await nativeNotifications();
	if (!plugin) return;
	try {
		await cancelNotification(plugin, treeId, 'date');
		await cancelNotification(plugin, treeId, 'window');
	} catch (error) {
		console.error('cancelAllRevisitNotificationsForTree failed:', error);
	}
}

export async function scheduleRevisitDateNotification(
	treeId: string,
	title: string,
	isoDate: string | null | undefined,
	options?: ScheduleNotifyOptions
): Promise<ScheduleDateResult> {
	const plugin = await nativeNotifications();
	if (!plugin) return 'skipped';

	const date = parseIsoDate(isoDate);
	if (!date) {
		await cancelRevisitDateNotification(treeId);
		return 'skipped';
	}

	const at = revisitAtLocalEight(date);
	if (!at) {
		await cancelRevisitDateNotification(treeId);
		return 'skipped';
	}

	const interactive = options?.interactive === true;
	const alreadySentFor = parseIsoDate(options?.alreadySentFor);
	const now = new Date();

	if (at.getTime() > now.getTime()) {
		const exact = interactive
			? await ensureExactAlarmSetting()
			: await exactAlarmIsGranted(plugin);
		await presentNotification(plugin, {
			treeId,
			kind: 'date',
			title,
			body: m.revisit_notification_body(),
			at,
			exact
		});
		return interactive ? scheduledResult(exact) : 'scheduled';
	}

	if (alreadySentFor === date) {
		await cancelRevisitDateNotification(treeId);
		return 'skipped';
	}

	await presentNotification(plugin, {
		treeId,
		kind: 'date',
		title,
		body: m.revisit_notification_body()
	});
	return 'fired';
}

export async function fireWindowOpenedNotification(treeId: string, title: string): Promise<void> {
	const plugin = await nativeNotifications();
	if (!plugin) return;
	await presentNotification(plugin, {
		treeId,
		kind: 'window',
		title,
		body: m.revisit_window_notification_body()
	});
}

export async function scheduleHarvestWindowNotification(
	tree: HarvestWindowTree,
	title: string,
	options?: ScheduleNotifyOptions
): Promise<ScheduleWindowResult> {
	const plugin = await nativeNotifications();
	if (!plugin) return 'unavailable';

	const plan = harvestWindowNotifyPlan(tree.species, tree.latitude, tree.longitude);
	const interactive = options?.interactive === true;
	const now = Date.now();
	const yrsAt = options?.yrsAt && options.yrsAt.getTime() > now ? options.yrsAt : null;
	const calendarAt = plan.status === 'upcoming' ? plan.at : null;
	const at = earliestWindowNotifyAt(calendarAt, yrsAt);

	if (plan.status === 'open') {
		if (interactive) {
			await fireWindowOpenedNotification(tree.id, title);
		}
		return 'fired';
	}

	if (at) {
		const exact = interactive
			? await ensureExactAlarmSetting()
			: await exactAlarmIsGranted(plugin);
		await presentNotification(plugin, {
			treeId: tree.id,
			kind: 'window',
			title,
			body: m.revisit_window_notification_body(),
			at,
			exact
		});
		return interactive ? scheduledResult(exact) : 'scheduled';
	}

	await cancelHarvestWindowNotification(tree.id);
	return 'unavailable';
}

export async function listenRevisitNotificationTaps(
	onTreeId: (treeId: string) => void
): Promise<() => void> {
	const plugin = await nativeNotifications();
	if (!plugin) return () => {};

	const handle = await plugin.addListener('localNotificationActionPerformed', (event) => {
		const treeId = event.notification.extra?.treeId;
		if (typeof treeId === 'string' && treeId.trim()) {
			onTreeId(treeId);
		}
	});

	return () => {
		void handle.remove();
	};
}
