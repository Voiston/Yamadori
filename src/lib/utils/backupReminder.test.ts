import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	computeTreeInventoryFingerprint,
	evaluateBackupWarning,
	MAX_DAYS_WITHOUT_EXPORT
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

const emptyReminder = { lastExportAt: null, lastExportFingerprint: null };
const now = Date.parse('2026-06-22T12:00:00.000Z');

describe('computeTreeInventoryFingerprint', () => {
	it('changes when a tree is added', () => {
		const before = computeTreeInventoryFingerprint([sampleTree('a', '2026-01-01')]);
		const after = computeTreeInventoryFingerprint(
			[sampleTree('a', '2026-01-01'), sampleTree('b', '2026-02-01')]
		);
		expect(before).not.toBe(after);
	});

	it('does not change when a visit is added', () => {
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
		expect(before).toBe(after);
	});

	it('uses v2 prefix', () => {
		expect(computeTreeInventoryFingerprint([sampleTree('a', '2026-01-01')])).toBe('v2:1:a');
	});
});

describe('evaluateBackupWarning', () => {
	it('returns null when there are no trees', () => {
		expect(evaluateBackupWarning([], null, emptyReminder, false, now)).toBeNull();
	});

	it('warns when never exported', () => {
		const warning = evaluateBackupWarning(
			[sampleTree('a', '2026-01-01')],
			null,
			emptyReminder,
			false,
			now
		);
		expect(warning?.reason).toBe('never');
	});

	it('warns when a new tree is added since export', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const warning = evaluateBackupWarning(
			[sampleTree('a', '2026-01-01'), sampleTree('b', '2026-02-01')],
			null,
			{
				lastExportAt: '2026-06-20T10:00:00.000Z',
				lastExportFingerprint: fingerprint
			},
			false,
			now
		);
		expect(warning?.reason).toBe('changed');
	});

	it('does not warn when only a visit is added since export', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
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
				lastExportFingerprint: fingerprint
			},
			false,
			now
		);
		expect(warning).toBeNull();
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
			false,
			now
		);
		expect(warning).toBeNull();
	});

	it('does not warn changed for legacy fingerprint with visit added', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const legacyFingerprint = '1:a:2026-01-01|parking:none';
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
				lastExportFingerprint: legacyFingerprint
			},
			false,
			now
		);
		expect(warning?.reason).not.toBe('changed');
		expect(warning).toBeNull();
	});

	it('warns when export is stale', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeTreeInventoryFingerprint(trees);
		const staleDate = new Date(now - (MAX_DAYS_WITHOUT_EXPORT + 2) * 24 * 60 * 60 * 1000).toISOString();
		const warning = evaluateBackupWarning(
			trees,
			null,
			{ lastExportAt: staleDate, lastExportFingerprint: fingerprint },
			false,
			now
		);
		expect(warning?.reason).toBe('stale');
	});

	it('warns stale with legacy fingerprint when export is old', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const staleDate = new Date(now - (MAX_DAYS_WITHOUT_EXPORT + 2) * 24 * 60 * 60 * 1000).toISOString();
		const warning = evaluateBackupWarning(
			trees,
			null,
			{ lastExportAt: staleDate, lastExportFingerprint: '1:a:2026-01-01|parking:none' },
			false,
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
			false,
			now
		);
		expect(warning).toBeNull();
	});

	it('returns null when dismissed', () => {
		expect(
			evaluateBackupWarning([sampleTree('a', '2026-01-01')], null, emptyReminder, true, now)
		).toBeNull();
	});
});
