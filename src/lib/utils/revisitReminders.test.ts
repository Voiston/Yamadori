import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { treeStore } from '$lib/stores/trees.svelte';

const {
	mockIsAndroidApp,
	mockSchedule,
	mockCancelAll,
	mockCancelDate,
	mockCancelWindow,
	mockScheduleWindow,
	mockFireWindow,
	mockRefreshWeekWindow,
	mockUpdateTree,
	mockRunPersistBatch,
	mockTreeHarvestInWindow,
	weekWindowById,
	weekWindowViabilityById
} = vi.hoisted(() => ({
	mockIsAndroidApp: vi.fn(),
	mockSchedule: vi.fn(),
	mockCancelAll: vi.fn(),
	mockCancelDate: vi.fn(),
	mockCancelWindow: vi.fn(),
	mockScheduleWindow: vi.fn(),
	mockFireWindow: vi.fn(),
	mockRefreshWeekWindow: vi.fn(),
	mockUpdateTree: vi.fn(),
	mockRunPersistBatch: vi.fn(async (fn: () => unknown) => fn()),
	mockTreeHarvestInWindow: vi.fn(),
	weekWindowById: {} as Record<string, { rank: string }>,
	weekWindowViabilityById: {} as Record<string, { date: string; yrsDecision: string }[]>
}));

vi.mock('$lib/utils/platform', () => ({
	isAndroidApp: (...args: unknown[]) => mockIsAndroidApp(...args)
}));

vi.mock('$lib/utils/revisitNotifications', () => ({
	cancelAllRevisitNotificationsForTree: (...args: unknown[]) => mockCancelAll(...args),
	cancelRevisitDateNotification: (...args: unknown[]) => mockCancelDate(...args),
	cancelHarvestWindowNotification: (...args: unknown[]) => mockCancelWindow(...args),
	scheduleRevisitDateNotification: (...args: unknown[]) => mockSchedule(...args),
	scheduleHarvestWindowNotification: (...args: unknown[]) => mockScheduleWindow(...args),
	fireWindowOpenedNotification: (...args: unknown[]) => mockFireWindow(...args)
}));

vi.mock('$lib/stores/weekWindow.svelte', () => ({
	refreshWeekWindow: (...args: unknown[]) => mockRefreshWeekWindow(...args),
	weekWindowState: {
		get byId() {
			return weekWindowById;
		},
		get viabilityById() {
			return weekWindowViabilityById;
		},
		orderedIds: [],
		status: 'idle'
	}
}));

vi.mock('$lib/stores/trees.svelte', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/stores/trees.svelte')>();
	return {
		...actual,
		updateTree: mockUpdateTree,
		runPersistBatch: mockRunPersistBatch
	};
});

vi.mock('$lib/utils/weekWindow', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/weekWindow')>();
	return {
		...actual,
		treeHarvestInWindow: (...args: unknown[]) => mockTreeHarvestInWindow(...args)
	};
});

vi.mock('$lib/constants/species-i18n', () => ({
	speciesDisplayName: (value: string) => value
}));

import { processWindowNotifications, rescheduleRevisitDateNotifications } from './revisitReminders';

function makeTree(id: string, capturedAt: string): Tree {
	return {
		id,
		species: 'Pin',
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
		nextRevisitAt: '2099-01-01',
		capturedAt
	};
}

describe('rescheduleRevisitDateNotifications', () => {
	beforeEach(() => {
		mockIsAndroidApp.mockReturnValue(true);
		mockSchedule.mockReset().mockResolvedValue('scheduled');
		mockCancelAll.mockReset().mockResolvedValue(undefined);
		mockCancelDate.mockReset().mockResolvedValue(undefined);
		mockCancelWindow.mockReset().mockResolvedValue(undefined);
		mockScheduleWindow.mockReset().mockResolvedValue('unavailable');
		mockFireWindow.mockReset().mockResolvedValue(undefined);
		mockUpdateTree.mockReset().mockResolvedValue(undefined);
		mockRefreshWeekWindow.mockReset().mockResolvedValue(undefined);
		mockRunPersistBatch.mockClear();
		mockTreeHarvestInWindow.mockReset().mockReturnValue(false);
		for (const key of Object.keys(weekWindowById)) {
			delete weekWindowById[key];
		}
		for (const key of Object.keys(weekWindowViabilityById)) {
			delete weekWindowViabilityById[key];
		}
		treeStore.loaded = true;
	});

	it('schedules revisit alarms for every tree, including ones past the old free cap', async () => {
		const trees = [
			makeTree('visible-new', '2026-06-01'),
			makeTree('visible-mid', '2026-05-01'),
			makeTree('visible-old', '2026-04-01'),
			makeTree('formerly-hidden', '2026-01-01'),
			makeTree('formerly-hidden-older', '2025-01-01')
		];

		await rescheduleRevisitDateNotifications(trees);

		expect(mockCancelAll).not.toHaveBeenCalled();
		expect(mockSchedule).toHaveBeenCalledTimes(5);
		expect(mockSchedule.mock.calls.map((call) => call[0])).toEqual([
			'visible-new',
			'visible-mid',
			'visible-old',
			'formerly-hidden',
			'formerly-hidden-older'
		]);
	});

	it('persists dateNotifySentFor after a catch-up fire', async () => {
		mockSchedule.mockResolvedValue('fired');
		const tree = makeTree('due', '2026-06-01');
		tree.nextRevisitAt = '2026-08-01';

		await rescheduleRevisitDateNotifications([tree]);

		expect(mockUpdateTree).toHaveBeenCalledWith('due', { dateNotifySentFor: '2026-08-01' });
	});

	it('does not persist dateNotifySentFor when already sent', async () => {
		mockSchedule.mockResolvedValue('skipped');
		const tree = makeTree('due', '2026-06-01');
		tree.nextRevisitAt = '2026-08-01';
		tree.dateNotifySentFor = '2026-08-01';

		await rescheduleRevisitDateNotifications([tree]);

		expect(mockUpdateTree).not.toHaveBeenCalled();
	});

	it('refreshes week window before scheduling a harvest-window alarm', async () => {
		const order: string[] = [];
		mockRefreshWeekWindow.mockImplementation(async () => {
			order.push('refresh');
		});
		mockScheduleWindow.mockImplementation(async () => {
			order.push('schedule');
			return 'scheduled';
		});
		const tree = makeTree('due', '2026-06-01');
		tree.notifyOnWindow = true;
		await rescheduleRevisitDateNotifications([tree]);

		expect(mockRefreshWeekWindow).toHaveBeenCalled();
		expect(order.indexOf('refresh')).toBeLessThan(order.indexOf('schedule'));
	});

	it('passes the next YRS alarm into the window schedule', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 8, 4, 10, 0, 0));
		const tree = makeTree('due', '2026-06-01');
		tree.notifyOnWindow = true;
		tree.latitude = 48.85;
		tree.longitude = 2.35;
		weekWindowViabilityById[tree.id] = [{ date: '2026-09-08', yrsDecision: 'ACCEPTABLE' }];
		await rescheduleRevisitDateNotifications([tree]);

		expect(mockScheduleWindow).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'due' }),
			'Pin',
			expect.objectContaining({
				yrsAt: new Date(2026, 8, 8, 8, 0, 0, 0)
			})
		);
		vi.useRealTimers();
	});
});

describe('processWindowNotifications', () => {
	beforeEach(() => {
		mockIsAndroidApp.mockReturnValue(true);
		mockFireWindow.mockReset().mockResolvedValue(undefined);
		mockUpdateTree.mockReset().mockResolvedValue(undefined);
		mockRefreshWeekWindow.mockReset().mockResolvedValue(undefined);
		mockTreeHarvestInWindow.mockReset().mockReturnValue(false);
		for (const key of Object.keys(weekWindowById)) {
			delete weekWindowById[key];
		}
		for (const key of Object.keys(weekWindowViabilityById)) {
			delete weekWindowViabilityById[key];
		}
		treeStore.loaded = true;
	});

	it('fires when armed and the YRS window is open', async () => {
		const tree = makeTree('open', '2026-01-01');
		tree.notifyOnWindow = true;
		tree.windowNotifyArmed = true;
		weekWindowById[tree.id] = { rank: 'optimal' };

		await processWindowNotifications([tree]);

		expect(mockFireWindow).toHaveBeenCalledWith('open', 'Pin');
		expect(mockUpdateTree).toHaveBeenCalledWith('open', { windowNotifyArmed: false });
	});

	it('fires when armed and the harvest calendar is open', async () => {
		const tree = makeTree('cal', '2026-01-01');
		tree.notifyOnWindow = true;
		tree.windowNotifyArmed = true;
		mockTreeHarvestInWindow.mockReturnValue(true);

		await processWindowNotifications([tree]);

		expect(mockFireWindow).toHaveBeenCalledWith('cal', 'Pin');
		expect(mockUpdateTree).toHaveBeenCalledWith('cal', { windowNotifyArmed: false });
	});

	it('does not fire a second time when already disarmed', async () => {
		const tree = makeTree('done', '2026-01-01');
		tree.notifyOnWindow = true;
		tree.windowNotifyArmed = false;
		mockTreeHarvestInWindow.mockReturnValue(true);
		weekWindowById[tree.id] = { rank: 'calendar' };

		await processWindowNotifications([tree]);

		expect(mockFireWindow).not.toHaveBeenCalled();
		expect(mockUpdateTree).not.toHaveBeenCalled();
	});
});
