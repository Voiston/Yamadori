import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
	mockIsAndroidApp,
	mockSchedule,
	mockCancel,
	mockCreateChannel,
	mockRequest,
	mockCheck,
	mockCheckExact,
	mockChangeExact,
	mockHarvestPlan,
	mockRequestNotification,
	mockAddListener,
	mockRemoveListener
} = vi.hoisted(() => ({
	mockIsAndroidApp: vi.fn(),
	mockSchedule: vi.fn(),
	mockCancel: vi.fn(),
	mockCreateChannel: vi.fn(),
	mockRequest: vi.fn(),
	mockCheck: vi.fn(),
	mockCheckExact: vi.fn(),
	mockChangeExact: vi.fn(),
	mockHarvestPlan: vi.fn(),
	mockRequestNotification: vi.fn(),
	mockAddListener: vi.fn(),
	mockRemoveListener: vi.fn()
}));

vi.mock('$lib/utils/platform', () => ({
	isAndroidApp: (...args: unknown[]) => mockIsAndroidApp(...args)
}));

vi.mock('@capacitor/local-notifications', () => ({
	LocalNotifications: {
		schedule: mockSchedule,
		cancel: mockCancel,
		createChannel: mockCreateChannel,
		requestPermissions: mockRequest,
		checkPermissions: mockCheck,
		checkExactNotificationSetting: mockCheckExact,
		changeExactNotificationSetting: mockChangeExact,
		addListener: mockAddListener
	}
}));

vi.mock('$lib/utils/permissions', () => ({
	requestNotificationPermission: (...args: unknown[]) => mockRequestNotification(...args)
}));

vi.mock('$lib/geo/harvestWindowPrior', () => ({
	harvestWindowNotifyPlan: (...args: unknown[]) => mockHarvestPlan(...args)
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	revisit_channel_name: () => 'Revisit',
	revisit_channel_description: () => 'Reminders',
	revisit_notification_body: () => 'Revisit scheduled',
	revisit_window_notification_body: () => 'Window opening'
}));

import {
	cancelRevisitDateNotification,
	ensureExactAlarmSetting,
	listenRevisitNotificationTaps,
	requestRevisitNotificationPermission,
	scheduleHarvestWindowNotification,
	scheduleRevisitDateNotification
} from './revisitNotifications';

function scheduledNotification() {
	return mockSchedule.mock.calls[0]?.[0]?.notifications?.[0] as {
		schedule?: { at: Date; allowWhileIdle: boolean; isExactNotification: boolean };
		body: string;
		channelId: string;
	};
}

describe('revisitNotifications', () => {
	beforeEach(() => {
		mockIsAndroidApp.mockReset();
		mockSchedule.mockReset();
		mockCancel.mockReset();
		mockCreateChannel.mockReset();
		mockRequest.mockReset();
		mockCheck.mockReset();
		mockCheckExact.mockReset();
		mockChangeExact.mockReset();
		mockHarvestPlan.mockReset();
		mockRequestNotification.mockReset();
		mockAddListener.mockReset();
		mockRemoveListener.mockReset();
		mockRequestNotification.mockResolvedValue(true);
		mockCreateChannel.mockResolvedValue(undefined);
		mockSchedule.mockResolvedValue({ notifications: [] });
		mockCancel.mockResolvedValue(undefined);
		mockCheck.mockResolvedValue({ display: 'prompt' });
		mockRequest.mockResolvedValue({ display: 'granted' });
		mockCheckExact.mockResolvedValue({ exact_alarm: 'granted' });
		mockChangeExact.mockResolvedValue({ exact_alarm: 'granted' });
		mockAddListener.mockResolvedValue({ remove: mockRemoveListener });
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('delegates notification permission to the shared helper', async () => {
		mockRequestNotification.mockResolvedValue(true);
		await expect(requestRevisitNotificationPermission()).resolves.toBe(true);
		expect(mockRequestNotification).toHaveBeenCalled();
	});

	it('is a no-op on web when scheduling', async () => {
		mockIsAndroidApp.mockReturnValue(false);
		await expect(scheduleRevisitDateNotification('tree-1', 'Oak', '2099-01-01')).resolves.toBe(
			'skipped'
		);
		expect(mockSchedule).not.toHaveBeenCalled();
	});

	it('schedules a future date with allowWhileIdle', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
		await expect(scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15')).resolves.toBe(
			'scheduled'
		);
		expect(mockSchedule).toHaveBeenCalledTimes(1);
		const notification = scheduledNotification();
		expect(notification.schedule?.allowWhileIdle).toBe(true);
		expect(notification.schedule?.isExactNotification).toBe(true);
		expect(notification.schedule?.at.getTime()).toBe(new Date(2026, 0, 15, 8, 0, 0, 0).getTime());
		expect(notification.channelId).toBe('revisite_v2');
		expect(mockCheckExact).toHaveBeenCalled();
	});

	it('uses inexact alarms on boot when exact permission is missing', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockCheckExact.mockResolvedValue({ exact_alarm: 'denied' });
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
		await scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15');
		expect(scheduledNotification().schedule?.isExactNotification).toBe(false);
		expect(scheduledNotification().schedule?.allowWhileIdle).toBe(true);
		expect(mockChangeExact).not.toHaveBeenCalled();
	});

	it('opens Alarms settings when scheduling interactively without exact permission', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockCheckExact.mockResolvedValue({ exact_alarm: 'denied' });
		mockChangeExact.mockResolvedValue({ exact_alarm: 'denied' });
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
		await expect(
			scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15', { interactive: true })
		).resolves.toBe('scheduled-inexact');
		expect(mockChangeExact).toHaveBeenCalled();
		expect(scheduledNotification().schedule?.isExactNotification).toBe(false);
		expect(scheduledNotification().schedule?.allowWhileIdle).toBe(true);
	});

	it('does not open Alarms settings when exact permission is already granted', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 0));
		await expect(
			scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15', { interactive: true })
		).resolves.toBe('scheduled');
		expect(mockChangeExact).not.toHaveBeenCalled();
		expect(scheduledNotification().schedule?.isExactNotification).toBe(true);
	});

	it('shows a catch-up immediately when today is already past 8:00', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		const now = new Date(2026, 0, 15, 14, 0, 0);
		vi.setSystemTime(now);
		await expect(scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15')).resolves.toBe(
			'fired'
		);
		expect(mockSchedule).toHaveBeenCalledTimes(1);
		expect(scheduledNotification().schedule).toBeUndefined();
		expect(mockCancel).not.toHaveBeenCalled();
		expect(mockChangeExact).not.toHaveBeenCalled();
	});

	it('shows a catch-up immediately for an overdue date', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		const now = new Date(2026, 0, 16, 9, 0, 0);
		vi.setSystemTime(now);
		await expect(scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15')).resolves.toBe(
			'fired'
		);
		expect(mockSchedule).toHaveBeenCalledTimes(1);
		expect(scheduledNotification().schedule).toBeUndefined();
		expect(mockCancel).not.toHaveBeenCalled();
		expect(mockChangeExact).not.toHaveBeenCalled();
	});

	it('skips catch-up when the overdue date was already sent', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 16, 9, 0, 0));
		await expect(
			scheduleRevisitDateNotification('tree-1', 'Oak', '2026-01-15', {
				alreadySentFor: '2026-01-15'
			})
		).resolves.toBe('skipped');
		expect(mockSchedule).not.toHaveBeenCalled();
		expect(mockCancel).toHaveBeenCalled();
	});

	it('cancels a missing date instead of scheduling', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		await expect(scheduleRevisitDateNotification('tree-1', 'Oak', null)).resolves.toBe('skipped');
		expect(mockSchedule).not.toHaveBeenCalled();
		expect(mockCancel).toHaveBeenCalled();
		await cancelRevisitDateNotification('tree-1');
		expect(mockCancel).toHaveBeenCalled();
	});

	it('schedules a harvest-window alarm at the calendar start', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		const at = new Date(2026, 10, 1, 8, 0, 0, 0);
		mockHarvestPlan.mockReturnValue({ status: 'upcoming', at });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak'
			)
		).resolves.toBe('scheduled');
		expect(scheduledNotification().schedule?.at.getTime()).toBe(at.getTime());
		expect(scheduledNotification().schedule?.allowWhileIdle).toBe(true);
		expect(scheduledNotification().body).toBe('Window opening');
	});

	it('schedules the earlier of YRS and calendar', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 4, 10, 0, 0));
		const calendar = new Date(2026, 10, 1, 8, 0, 0, 0);
		const yrs = new Date(2026, 8, 8, 8, 0, 0, 0);
		mockHarvestPlan.mockReturnValue({ status: 'upcoming', at: calendar });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak',
				{ yrsAt: yrs }
			)
		).resolves.toBe('scheduled');
		expect(scheduledNotification().schedule?.at.getTime()).toBe(yrs.getTime());
		expect(scheduledNotification().schedule?.allowWhileIdle).toBe(true);
	});

	it('keeps calendar-only when no forecast is provided', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 4, 10, 0, 0));
		const calendar = new Date(2026, 10, 1, 8, 0, 0, 0);
		mockHarvestPlan.mockReturnValue({ status: 'upcoming', at: calendar });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak',
				{ yrsAt: null }
			)
		).resolves.toBe('scheduled');
		expect(scheduledNotification().schedule?.at.getTime()).toBe(calendar.getTime());
	});

	it('schedules YRS when the harvest calendar is unavailable', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 4, 10, 0, 0));
		const yrs = new Date(2026, 8, 8, 8, 0, 0, 0);
		mockHarvestPlan.mockReturnValue({ status: 'unavailable' });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak',
				{ yrsAt: yrs }
			)
		).resolves.toBe('scheduled');
		expect(scheduledNotification().schedule?.at.getTime()).toBe(yrs.getTime());
	});

	it('does not fire a window alert on boot when the calendar is already open', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockHarvestPlan.mockReturnValue({ status: 'open' });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak'
			)
		).resolves.toBe('fired');
		expect(mockSchedule).not.toHaveBeenCalled();
	});

	it('shows a window alert immediately when the calendar is open and interactive', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockHarvestPlan.mockReturnValue({ status: 'open' });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak',
				{ interactive: true }
			)
		).resolves.toBe('fired');
		expect(scheduledNotification().schedule).toBeUndefined();
		expect(mockChangeExact).not.toHaveBeenCalled();
	});

	it('prompts for exact alarms when scheduling a window interactively', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockCheckExact.mockResolvedValue({ exact_alarm: 'denied' });
		mockChangeExact.mockResolvedValue({ exact_alarm: 'denied' });
		const at = new Date(2026, 10, 1, 8, 0, 0, 0);
		mockHarvestPlan.mockReturnValue({ status: 'upcoming', at });
		await expect(
			scheduleHarvestWindowNotification(
				{ id: 'tree-1', species: 'Oak', latitude: 48.85, longitude: 2.35 },
				'Oak',
				{ interactive: true }
			)
		).resolves.toBe('scheduled-inexact');
		expect(mockChangeExact).toHaveBeenCalled();
		expect(scheduledNotification().schedule?.allowWhileIdle).toBe(true);
		expect(scheduledNotification().schedule?.isExactNotification).toBe(false);
	});

	it('reports granted exact alarms without opening settings', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		await expect(ensureExactAlarmSetting()).resolves.toBe(true);
		expect(mockChangeExact).not.toHaveBeenCalled();
	});

	it('forwards a notification tap tree id', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		const onTreeId = vi.fn();
		const stop = await listenRevisitNotificationTaps(onTreeId);
		const listener = mockAddListener.mock.calls[0]?.[1] as (event: {
			notification: { extra?: { treeId?: string } };
		}) => void;
		listener({ notification: { extra: { treeId: 'tree-1' } } });
		expect(onTreeId).toHaveBeenCalledWith('tree-1');
		stop();
		expect(mockRemoveListener).toHaveBeenCalled();
	});
});
