import { describe, expect, it } from 'vitest';
import {
	COMPASS_APPROACH_HYSTERESIS_M,
	compassApproachBand,
	compassApproachHaptic,
	compassArriveRadiusM,
	resolveCompassApproachBand
} from './compassApproach';

describe('compassArriveRadiusM', () => {
	it('uses 12 m when GPS is tighter than that', () => {
		expect(compassArriveRadiusM(null)).toBe(12);
		expect(compassArriveRadiusM(4)).toBe(12);
	});

	it('widens to GPS accuracy so arrival is not claimed too early', () => {
		expect(compassArriveRadiusM(25)).toBe(25);
	});
});

describe('compassApproachBand', () => {
	it('returns far when distance is missing', () => {
		expect(compassApproachBand(null, 8)).toBe('far');
	});

	it('maps descending distance to 100 / 50 / 20 / arrive', () => {
		expect(compassApproachBand(140, 8)).toBe('far');
		expect(compassApproachBand(100, 8)).toBe('100');
		expect(compassApproachBand(50, 8)).toBe('50');
		expect(compassApproachBand(20, 8)).toBe('20');
		expect(compassApproachBand(12, 8)).toBe('arrive');
	});

	it('skips the 20 m band when arrival radius swallows it', () => {
		expect(compassApproachBand(22, 25)).toBe('arrive');
	});
});

describe('resolveCompassApproachBand', () => {
	it('accepts a closer band immediately', () => {
		expect(resolveCompassApproachBand(48, 8, '100')).toBe('50');
	});

	it('holds the previous band across GPS wobble inside hysteresis', () => {
		const wobble = 50 + COMPASS_APPROACH_HYSTERESIS_M - 1;
		expect(resolveCompassApproachBand(wobble, 8, '50')).toBe('50');
	});

	it('steps back after leaving the band plus hysteresis', () => {
		const away = 50 + COMPASS_APPROACH_HYSTERESIS_M + 1;
		expect(resolveCompassApproachBand(away, 8, '50')).toBe('100');
	});
});

describe('compassApproachHaptic', () => {
	it('ticks selection when entering an approach band', () => {
		expect(compassApproachHaptic('far', '100')).toBe('selection');
		expect(compassApproachHaptic('100', '20')).toBe('selection');
	});

	it('fires success only on arrival', () => {
		expect(compassApproachHaptic('20', 'arrive')).toBe('success');
		expect(compassApproachHaptic('far', 'arrive')).toBe('success');
	});

	it('does not buzz when holding or stepping outward', () => {
		expect(compassApproachHaptic('50', '50')).toBe(null);
		expect(compassApproachHaptic('50', '100')).toBe(null);
	});
});
