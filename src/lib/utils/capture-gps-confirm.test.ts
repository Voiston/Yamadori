import { describe, expect, it } from 'vitest';
import { shouldConfirmGpsBeforeSave } from './capture-gps-confirm';

const position = (accuracyMeters: number | null) => ({
	latitude: 48.1,
	longitude: 2.3,
	accuracyMeters
});

describe('shouldConfirmGpsBeforeSave', () => {
	it('requires confirmation when position is missing', () => {
		expect(shouldConfirmGpsBeforeSave(null)).toBe(true);
	});

	it('requires confirmation when accuracy is unknown', () => {
		expect(shouldConfirmGpsBeforeSave(position(null))).toBe(true);
	});

	it('requires confirmation when accuracy is poor', () => {
		expect(shouldConfirmGpsBeforeSave(position(26))).toBe(true);
	});

	it('does not require confirmation at the poor threshold boundary', () => {
		expect(shouldConfirmGpsBeforeSave(position(25))).toBe(false);
	});

	it('does not require confirmation when accuracy is good', () => {
		expect(shouldConfirmGpsBeforeSave(position(10))).toBe(false);
	});
});
