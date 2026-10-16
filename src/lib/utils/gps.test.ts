import { describe, expect, it } from 'vitest';
import {
	gpsQualityUpgrade,
	isBetterAccuracy,
	shouldReplaceBestCapturePosition
} from './gps';

describe('gpsQualityUpgrade', () => {
	it('ticks selection on poor → fair', () => {
		expect(gpsQualityUpgrade('poor', 'fair')).toBe('selection');
		expect(gpsQualityUpgrade('unknown', 'fair')).toBe('selection');
	});

	it('ticks success on fair → excellent (and skips)', () => {
		expect(gpsQualityUpgrade('fair', 'excellent')).toBe('success');
		expect(gpsQualityUpgrade('poor', 'excellent')).toBe('success');
	});

	it('does not buzz on retreat, hold, or unknown → poor', () => {
		expect(gpsQualityUpgrade('excellent', 'fair')).toBe(null);
		expect(gpsQualityUpgrade('fair', 'fair')).toBe(null);
		expect(gpsQualityUpgrade('unknown', 'poor')).toBe(null);
	});
});

describe('isBetterAccuracy', () => {
	it('returns false when candidate accuracy is null', () => {
		expect(isBetterAccuracy(null, 10)).toBe(false);
		expect(isBetterAccuracy(null, null)).toBe(false);
	});

	it('returns true when there is no current best', () => {
		expect(isBetterAccuracy(15, null)).toBe(true);
	});

	it('returns true when candidate is strictly more accurate', () => {
		expect(isBetterAccuracy(10, 15)).toBe(true);
	});

	it('returns false when candidate equals current best (regression guard)', () => {
		expect(isBetterAccuracy(15.091, 15.091)).toBe(false);
	});

	it('returns false when candidate is worse', () => {
		expect(isBetterAccuracy(20, 15)).toBe(false);
	});
});

describe('shouldReplaceBestCapturePosition', () => {
	const home = { latitude: 48.8566, longitude: 2.3522, accuracyMeters: 4 };
	const forest = { latitude: 48.8566 + 0.18, longitude: 2.3522, accuracyMeters: 12 };
	const onSite = { latitude: 48.8566, longitude: 2.3522, accuracyMeters: 12 };
	const nearbyWorse = { latitude: 48.8566 + 0.000135, longitude: 2.3522, accuracyMeters: 18 };
	const nearbyBetter = { latitude: 48.8566 + 0.000135, longitude: 2.3522, accuracyMeters: 8 };

	it('takes live when there is no best yet', () => {
		expect(shouldReplaceBestCapturePosition(null, home)).toBe(true);
	});

	it('replaces a house trophy when live jumps kilometres away', () => {
		expect(shouldReplaceBestCapturePosition(home, forest)).toBe(true);
	});

	it('keeps a tighter on-site best while GNSS wobbles ~15 m', () => {
		expect(shouldReplaceBestCapturePosition(onSite, nearbyWorse)).toBe(false);
		expect(shouldReplaceBestCapturePosition(onSite, nearbyBetter)).toBe(true);
	});
});
