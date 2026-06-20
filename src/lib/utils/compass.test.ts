import { describe, expect, it } from 'vitest';
import {
	compassHeadingFromTilt,
	createHeadingFilterState,
	processHeadingSample,
	refineTrueHeading
} from './compass';
import {
	blendHeadingsCircular,
	fuseWithGpsCourse,
	magneticToTrueHeading,
	shortestAngleDelta,
	smoothBearing
} from './haversine';
import { getMagneticDeclinationDeg } from './magneticDeclination';

describe('compassHeadingFromTilt', () => {
	it('stays stable near the east/west singularity (alpha 90, beta 90)', () => {
		const base = compassHeadingFromTilt(90, 90, 0);
		const perturbed = compassHeadingFromTilt(90, 90, 0.5);

		expect(Math.abs(base - perturbed)).toBeLessThan(5);
	});

	it('changes gradually when alpha shifts slightly in portrait', () => {
		const first = compassHeadingFromTilt(45, 90, 0);
		const second = compassHeadingFromTilt(46, 90, 0);

		expect(Math.abs(first - second)).toBeLessThan(5);
	});
});

describe('processHeadingSample', () => {
	it('rejects a sudden outlier spike', () => {
		const state = createHeadingFilterState();
		const first = processHeadingSample(state, 10);
		expect(first).toBe(10);

		const spike = processHeadingSample(state, 130);
		expect(spike).toBeNull();
		expect(state.smoothed).toBe(10);
	});

	it('accepts gradual rotation', () => {
		const state = createHeadingFilterState();
		processHeadingSample(state, 10);
		const next = processHeadingSample(state, 25);

		expect(next).not.toBeNull();
		expect(next!).toBeGreaterThan(10);
		expect(next!).toBeLessThan(25);
	});

	it('resets after three consecutive outliers', () => {
		const state = createHeadingFilterState();
		processHeadingSample(state, 10);
		processHeadingSample(state, 130);
		processHeadingSample(state, 135);
		const reset = processHeadingSample(state, 140);

		expect(reset).toBe(140);
	});
});

describe('shortestAngleDelta', () => {
	it('chooses +20° from 350° to 10°', () => {
		expect(shortestAngleDelta(350, 10)).toBe(20);
	});

	it('chooses -20° from 10° to 350°', () => {
		expect(shortestAngleDelta(10, 350)).toBe(-20);
	});
});

describe('smoothBearing', () => {
	it('dampens bearing updates when movement is small', () => {
		const smoothed = smoothBearing(10, 50, 0.5);
		expect(smoothed).toBeGreaterThan(10);
		expect(smoothed).toBeLessThan(20);
	});

	it('tracks bearing faster when movement is large', () => {
		const smoothed = smoothBearing(10, 50, 5);
		expect(smoothed).toBeGreaterThan(20);
	});
});

describe('magnetic declination and GPS fusion', () => {
	it('applies declination for magnetic readings in France', () => {
		const declination = getMagneticDeclinationDeg(48.85, 2.35);
		expect(declination).toBeGreaterThan(-5);
		expect(declination).toBeLessThan(5);

		const trueHeading = magneticToTrueHeading(0, declination);
		expect(Math.abs(trueHeading - declination)).toBeLessThan(0.01);
	});

	it('keeps iOS true-north readings without declination', () => {
		const refined = refineTrueHeading(
			{ heading: 90, reference: 'true' },
			{ latitude: 48.85, longitude: 2.35, gpsCourseDegrees: null, speedMps: null }
		);
		expect(refined).toBe(90);
	});

	it('blends compass with GPS course when walking', () => {
		const fused = fuseWithGpsCourse(0, 90, 2);
		expect(fused).toBeGreaterThan(0);
		expect(fused).toBeLessThan(90);
	});

	it('ignores GPS course when stationary', () => {
		expect(fuseWithGpsCourse(45, 200, 0.2)).toBe(45);
	});

	it('interpolates headings on the short arc', () => {
		const blended = blendHeadingsCircular(350, 10, 0.5);
		expect(Math.min(blended, 360 - blended)).toBeLessThan(20);
	});
});
