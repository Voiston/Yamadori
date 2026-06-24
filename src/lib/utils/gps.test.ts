import { describe, expect, it } from 'vitest';
import { isBetterAccuracy } from './gps';

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
