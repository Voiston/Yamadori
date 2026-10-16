import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	backupNotificationAt,
	computeTreeInventoryFingerprint,
	DISMISS_MS,
	EMPTY_BACKUP_DISMISS,
	evaluateBackupWarning,
	INVENTORY_FINGERPRINT_PREFIX,
	isBackupWarningDismissed,
	isTestNotebook,
	MAX_DAYS_WITHOUT_EXPORT,
	notebookBecameRealAt,
	shouldShowBackupHomeCard,
	type BackupReminderDismiss
} from './backupReminder';

function sampleTree(id: string, capturedAt: string, visits: Tree['visits'] = []): Tree {
	return {
		id,
		species: 'Érable',
		notes: '',
		photos: [],
		visits,
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

function initialVisit(id: string, visitedAt: string): Tree['visits'][number] {
	return { id, visitedAt, note: 'Premier passage', photos: [] };
}

const emptyReminder = { lastExportAt: null, lastExportFingerprint: null };
const now = Date.parse('2026-06-22T12:00:00.000Z');
const recentCapture = '2026-06-20T10:00:00.000Z';

describe('computeTreeInventoryFingerprint', () => {
	it('changes when a tree is added', () => {
		const before = computeTreeInventoryFingerprint([sampleTree('a', '2026-01-01')]);
		const after = computeTreeInventoryFingerprint([
			sampleTree('a', '2026-01-01'),
			sampleTree('b', '2026-02-01')
		]);
		expect(before).not.toBe(after);
	});

	it('changes when a visit is added', () => {
		const before = computeTreeInventoryFingerprint([sampleTree('a', '2026-01-01')]);
		const after = computeTreeInventoryFingerprint([
			sampleTree('a', '2026-01-01', [
				{
					id: 'visit-1',
					visitedAt: '2026-06-01T10:00:00.000Z',
					note: 'Revisite',
					photos: []
				}
			])
		]);
		expect(before).not.toBe(after);
	});

	it('uses v3 prefix with visit counts', () => {
		expect(computeTreeInventoryFingerprint([sampleTree('a', '2026-01-01')])).toBe(
			`${INVENTORY_FINGERPRINT_PREFIX}1:a:0`
		);
		expect(
			computeTreeInventoryFingerprint([
				sampleTree('a', '2026-01-01', [initialVisit('v1', '2026-01-01')])
			])
		).toBe(`${INVENTORY_FINGERPRINT_PREFIX}1:a:1`);
	});
});

describe('isTestNotebook', () => {
	it('is true for a single tree with at most one visit', () => {
		expect(isTestNotebook([sampleTree('a', recentCapture)])).toBe(true);
		expect(
			isTestNotebook([sampleTree('a', recentCapture, [initialVisit('v1', recentCapture)])])
		).toBe(true);
	});

	it('is false for a second tree or an extra visit', () => {
		expect(
			isTestNotebook([sampleTree('a', recentCapture), sampleTree('b', recentCapture)])
		).toBe(false);
		expect(
			isTestNotebook([
				sampleTree('a', recentCapture, [
					initialVisit('v1', recentCapture),
					{ id: 'v2', visitedAt: '2026-06-21T10:00:00.000Z', note: 'Revisite', photos: [] }
				])
			])
		).toBe(false);
	});
});

describe('evaluateBackupWarning', () => {
	it('returns null when there are no trees', () => {
		expect(evaluateBackupWarning([], null, emptyReminder, EMPTY_BACKUP_DISMISS, now)).toBeNull();
	});

	it('stays quiet for a recent single test tree that was never exported', () => {
		expect(
			evaluateBackupWarning(
				[sampleTree('a', recentCapture, [initialVisit('v1', recentCapture)])],
				null,
				emptyReminder,
				EMPTY_BACKUP_DISMISS,
				now
			)
		).toBeNull();
	});

	it('warns never when a second tree is added without export', () => {
		const warning = evaluateBackupWarning(
			[sampleTree('a', recentCapture), sampleTree('b', '2026-06-21T10:00:00.000Z')],
			null,
			emptyReminder,
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('never');
		expect(shouldShowBackupHomeCard(warning)).toBe(true);
	});

	it('warns changed when a revisit is added without export', () => {
		const warning = evaluateBackupWarning(
			[
				sampleTree('a', recentCapture, [
					initialVisit('v1', recentCapture),
					{ id: 'v2', visitedAt: '2026-06-21T10:00:00.000Z', note: 'Revisite', photos: [] }
				])
			],
			null,
			emptyReminder,
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('changed');
		expect(shouldShowBackupHomeCard(warning)).toBe(false);
	});

	it('warns stale when a single tree is older than 14 days without export', () => {
		const capturedAt = new Date(
			now - (MAX_DAYS_WITHOUT_EXPORT + 2) * 24 * 60 * 60 * 1000
		).toISOString();
		const warning = evaluateBackupWarning(
			[sampleTree('a', capturedAt, [initialVisit('v1', capturedAt)])],
			null,
			emptyReminder,
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('stale');
		expect(shouldShowBackupHomeCard(warning)).toBe(true);
	});

	it('warns when a new tree is added since export', () => {
		const trees = [sampleTree('a', '2026-01-01', [initialVisit('v1', '2026-01-01')])];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const warning = evaluateBackupWarning(
			[
				sampleTree('a', '2026-01-01', [initialVisit('v1', '2026-01-01')]),
				sampleTree('b', '2026-02-01')
			],
			null,
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: fingerprint
			},
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('changed');
	});

	it('warns when a visit is added since export', () => {
		const trees = [sampleTree('a', '2026-01-01', [initialVisit('v1', '2026-01-01')])];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const warning = evaluateBackupWarning(
			[
				sampleTree('a', '2026-01-01', [
					initialVisit('v1', '2026-01-01'),
					{
						id: 'visit-2',
						visitedAt: '2026-06-21T10:00:00.000Z',
						note: 'Revisite',
						photos: []
					}
				])
			],
			null,
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: fingerprint
			},
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('changed');
	});

	it('does not warn when only parking is saved since export', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const warning = evaluateBackupWarning(
			trees,
			{
				latitude: 45,
				longitude: 6,
				accuracyMeters: 5,
				savedAt: '2026-06-21T10:00:00.000Z'
			},
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: fingerprint
			},
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning).toBeNull();
	});

	it('does not warn changed for legacy fingerprint with visit added', () => {
		const warning = evaluateBackupWarning(
			[
				sampleTree('a', '2026-01-01', [
					{
						id: 'visit-1',
						visitedAt: '2026-06-21T10:00:00.000Z',
						note: 'Revisite',
						photos: []
					}
				])
			],
			null,
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: '1:a:2026-01-01|parking:none'
			},
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).not.toBe('changed');
		expect(warning).toBeNull();
	});

	it('warns changed once when a v2 fingerprint no longer matches v3', () => {
		const trees = [sampleTree('a', recentCapture, [initialVisit('v1', recentCapture)])];
		const warning = evaluateBackupWarning(
			trees,
			null,
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: 'v2:1:a'
			},
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('changed');
	});

	it('warns when export is stale', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const staleDate = new Date(
			now - (MAX_DAYS_WITHOUT_EXPORT + 2) * 24 * 60 * 60 * 1000
		).toISOString();
		const warning = evaluateBackupWarning(
			trees,
			null,
			{ lastExportAt: staleDate, lastExportFingerprint: fingerprint },
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('stale');
	});

	it('warns stale with legacy fingerprint when export is old', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const staleDate = new Date(
			now - (MAX_DAYS_WITHOUT_EXPORT + 2) * 24 * 60 * 60 * 1000
		).toISOString();
		const warning = evaluateBackupWarning(
			trees,
			null,
			{ lastExportAt: staleDate, lastExportFingerprint: '1:a:2026-01-01|parking:none' },
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning?.reason).toBe('stale');
	});

	it('returns null when export is recent and fingerprint matches', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const warning = evaluateBackupWarning(
			trees,
			null,
			{ lastExportAt: '2026-06-20T10:00:00.000Z', lastExportFingerprint: fingerprint },
			EMPTY_BACKUP_DISMISS,
			now
		);
		expect(warning).toBeNull();
	});

	it('hides the same reason for 24h then shows it again', () => {
		const trees = [sampleTree('a', recentCapture), sampleTree('b', recentCapture)];
		const dismiss: BackupReminderDismiss = {
			dismissedUntil: new Date(now + DISMISS_MS).toISOString(),
			dismissedReason: 'never'
		};
		expect(evaluateBackupWarning(trees, null, emptyReminder, dismiss, now)).toBeNull();
		expect(
			evaluateBackupWarning(trees, null, emptyReminder, dismiss, now + DISMISS_MS + 1)?.reason
		).toBe('never');
	});

	it('redisplays immediately when the reason changes', () => {
		const oneTree = [sampleTree('a', recentCapture), sampleTree('b', recentCapture)];
		const dismiss: BackupReminderDismiss = {
			dismissedUntil: new Date(now + DISMISS_MS).toISOString(),
			dismissedReason: 'never'
		};
		const withVisit = [
			sampleTree('a', recentCapture, [
				initialVisit('v1', recentCapture),
				{ id: 'v2', visitedAt: '2026-06-21T10:00:00.000Z', note: 'Revisite', photos: [] }
			])
		];
		expect(evaluateBackupWarning(oneTree, null, emptyReminder, dismiss, now)).toBeNull();
		expect(
			evaluateBackupWarning(
				withVisit,
				null,
				{
					lastExportAt: '2026-06-20T10:00:00.000Z',
					lastExportFingerprint: computeTreeInventoryFingerprint([
						sampleTree('a', recentCapture, [initialVisit('v1', recentCapture)])
					])
				},
				dismiss,
				now
			)?.reason
		).toBe('changed');
	});
});

describe('isBackupWarningDismissed', () => {
	it('is false when the until timestamp is missing or expired', () => {
		expect(
			isBackupWarningDismissed(
				{ dismissedUntil: null, dismissedReason: 'never' },
				'never',
				now
			)
		).toBe(false);
		expect(
			isBackupWarningDismissed(
				{ dismissedUntil: new Date(now - 1).toISOString(), dismissedReason: 'never' },
				'never',
				now
			)
		).toBe(false);
	});
});

describe('notebookBecameRealAt / backupNotificationAt', () => {
	it('returns the second tree capture time', () => {
		expect(
			notebookBecameRealAt([
				sampleTree('a', '2026-06-01T10:00:00.000Z'),
				sampleTree('b', '2026-06-10T10:00:00.000Z')
			])
		).toBe('2026-06-10T10:00:00.000Z');
	});

	it('returns the extra visit time on a single tree', () => {
		expect(
			notebookBecameRealAt([
				sampleTree('a', '2026-06-01T10:00:00.000Z', [
					initialVisit('v1', '2026-06-01T10:00:00.000Z'),
					{ id: 'v2', visitedAt: '2026-06-08T08:00:00.000Z', note: 'Revisite', photos: [] }
				])
			])
		).toBe('2026-06-08T08:00:00.000Z');
	});

	it('does not schedule a notification for a test notebook', () => {
		expect(
			backupNotificationAt(
				[sampleTree('a', recentCapture, [initialVisit('v1', recentCapture)])],
				emptyReminder,
				now
			)
		).toBeNull();
	});

	it('schedules 14 days after the notebook became real', () => {
		const at = backupNotificationAt(
			[sampleTree('a', recentCapture), sampleTree('b', '2026-06-21T12:00:00.000Z')],
			emptyReminder,
			now
		);
		expect(at?.toISOString()).toBe('2026-07-05T12:00:00.000Z');
	});

	it('schedules 14 days after last export when that is still in the future', () => {
		const at = backupNotificationAt(
			[sampleTree('a', recentCapture), sampleTree('b', recentCapture)],
			{ lastExportAt: '2026-06-20T12:00:00.000Z' },
			now
		);
		expect(at?.toISOString()).toBe('2026-07-04T12:00:00.000Z');
	});

	it('does not schedule when the due time is already past', () => {
		expect(
			backupNotificationAt(
				[sampleTree('a', recentCapture)],
				{ lastExportAt: '2026-05-01T12:00:00.000Z' },
				now
			)
		).toBeNull();
	});
});
