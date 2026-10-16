import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import type { Tree } from '$lib/types/tree';

const { mockIsAndroidApp, mockSchedule, mockCancel, mockCreateChannel, mockHasPermission } =
	vi.hoisted(() => ({
		mockIsAndroidApp: vi.fn(),
		mockSchedule: vi.fn(),
		mockCancel: vi.fn(),
		mockCreateChannel: vi.fn(),
		mockHasPermission: vi.fn()
	}));

vi.mock('$lib/utils/platform', () => ({
	isAndroidApp: (...args: unknown[]) => mockIsAndroidApp(...args)
}));

vi.mock('@capacitor/local-notifications', () => ({
	LocalNotifications: {
		schedule: mockSchedule,
		cancel: mockCancel,
		createChannel: mockCreateChannel
	}
}));

vi.mock('$lib/utils/permissions', () => ({
	hasNotificationPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	backup_channel_name: () => 'Backup',
	backup_channel_description: () => 'Export reminder',
	backup_notification_title: () => 'Export notebook',
	backup_notification_body: () => 'Copy the file'
}));

import {
	BACKUP_CHANNEL_ID,
	BACKUP_NOTIFICATION_ID,
	isBackupNotificationTap,
	syncBackupReminderNotification
} from './backupNotifications';

function sampleTree(id: string, capturedAt: string): Tree {
	return {
		id,
		species: 'Érable',
		notes: '',
		photos: [],
		visits: [],
		assessment: { ...DEFAULT_ASSESSMENT },
		voiceNote: null,
		latitude: null,
		longitude: null,
		accuracyMeters: null,
		altitudeMeters: null,
		frontHeadingDegrees: null,
		isFavorite: false,
		climateHistory: null,
		locationLabel: null,
		cadastreInfo: null,
		harvestEthicsConfirmation: null,
		environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
		yrsAtCapture: null,
		capturedAt
	};
}

describe('backupNotifications', () => {
	beforeEach(() => {
		mockIsAndroidApp.mockReturnValue(true);
		mockHasPermission.mockResolvedValue(true);
		mockSchedule.mockResolvedValue(undefined);
		mockCancel.mockResolvedValue(undefined);
		mockCreateChannel.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('skips when not Android', async () => {
		mockIsAndroidApp.mockReturnValue(false);
		await expect(
			syncBackupReminderNotification([sampleTree('a', '2026-06-01T00:00:00.000Z')], {
				lastExportAt: null
			})
		).resolves.toBe('skipped');
		expect(mockSchedule).not.toHaveBeenCalled();
		expect(mockHasPermission).not.toHaveBeenCalled();
	});

	it('does not request permission and cancels when it is not already granted', async () => {
		mockHasPermission.mockResolvedValue(false);
		await expect(
			syncBackupReminderNotification(
				[
					sampleTree('a', '2026-06-01T00:00:00.000Z'),
					sampleTree('b', '2026-06-21T00:00:00.000Z')
				],
				{ lastExportAt: null }
			)
		).resolves.toBe('skipped');
		expect(mockSchedule).not.toHaveBeenCalled();
		expect(mockCancel).toHaveBeenCalled();
	});

	it('does not schedule for a single test tree', async () => {
		await expect(
			syncBackupReminderNotification([sampleTree('a', '2026-06-21T00:00:00.000Z')], {
				lastExportAt: null
			})
		).resolves.toBe('canceled');
		expect(mockSchedule).not.toHaveBeenCalled();
		expect(mockCancel).toHaveBeenCalledWith({
			notifications: [{ id: BACKUP_NOTIFICATION_ID }]
		});
	});

	it('schedules 14 days after the notebook became real', async () => {
		const now = Date.parse('2026-06-22T12:00:00.000Z');
		await expect(
			syncBackupReminderNotification(
				[
					sampleTree('a', '2026-06-01T00:00:00.000Z'),
					sampleTree('b', '2026-06-21T12:00:00.000Z')
				],
				{ lastExportAt: null },
				now
			)
		).resolves.toBe('scheduled');

		const notification = mockSchedule.mock.calls[0]?.[0]?.notifications?.[0];
		expect(notification.channelId).toBe(BACKUP_CHANNEL_ID);
		expect(notification.schedule.at.toISOString()).toBe('2026-07-05T12:00:00.000Z');
		expect(notification.schedule.isExactNotification).toBe(false);
		expect(notification.extra).toEqual({ yamadori: 'backup' });
		expect(mockCreateChannel).toHaveBeenCalled();
	});
});

describe('isBackupNotificationTap', () => {
	it('detects the backup extra', () => {
		expect(isBackupNotificationTap({ yamadori: 'backup' })).toBe(true);
		expect(isBackupNotificationTap({ treeId: 'abc' })).toBe(false);
		expect(isBackupNotificationTap(null)).toBe(false);
	});
});
