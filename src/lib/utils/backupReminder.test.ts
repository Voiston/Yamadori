import { describe, expect, it } from 'vitest';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import {
	computeDataFingerprint,
	evaluateBackupWarning,
	MAX_DAYS_WITHOUT_EXPORT
} from './backupReminder';

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

const emptyReminder = { lastExportAt: null, lastExportFingerprint: null };
const now = Date.parse('2026-06-22T12:00:00.000Z');

describe('computeDataFingerprint', () => {
	it('changes when a tree is added', () => {
		const before = computeDataFingerprint([sampleTree('a', '2026-01-01')], null);
		const after = computeDataFingerprint(
			[sampleTree('a', '2026-01-01'), sampleTree('b', '2026-02-01')],
			null
		);
		expect(before).not.toBe(after);
	});

	it('changes when parking is saved', () => {
		const withoutParking = computeDataFingerprint([sampleTree('a', '2026-01-01')], null);
		const withParking = computeDataFingerprint([sampleTree('a', '2026-01-01')], {
			latitude: 45,
			longitude: 6,
			accuracyMeters: 5,
			savedAt: '2026-03-01T10:00:00.000Z'
		});
		expect(withoutParking).not.toBe(withParking);
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

	it('warns when data changed since export', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeDataFingerprint(trees, null);
		const warning = evaluateBackupWarning(
			[sampleTree('a', '2026-06-01')],
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

	it('warns when export is stale', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeDataFingerprint(trees, null);
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

	it('returns null when export is recent and fingerprint matches', () => {
		const trees = [sampleTree('a', '2026-01-01')];
		const fingerprint = computeDataFingerprint(trees, null);
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
