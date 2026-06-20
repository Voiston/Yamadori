import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	compassHeadingFromTilt,
	createHeadingFilterState,
	createThrottledOrientationProcessor,
	EMPTY_HEADING_FUSION_CONTEXT,
	ORIENTATION_THROTTLE_MS,
	pickActiveReading,
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
import {
	loadMagneticDeclinationDeg,
	resetMagneticDeclinationCache
} from './magneticDeclination';

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
	it('applies declination from context for magnetic readings', () => {
		const refined = refineTrueHeading(
			{ heading: 0, reference: 'magnetic' },
			{
				latitude: 48.85,
				longitude: 2.35,
				declinationDeg: 2,
				gpsCourseDegrees: null,
				speedMps: null
			}
		);
		expect(refined).toBe(2);
	});

	it('works without declination in empty context', () => {
		const refined = refineTrueHeading(
			{ heading: 45, reference: 'magnetic' },
			EMPTY_HEADING_FUSION_CONTEXT
		);
		expect(refined).toBe(45);
	});

	it('keeps iOS true-north readings without declination', () => {
		const refined = refineTrueHeading(
			{ heading: 90, reference: 'true' },
			{
				latitude: 48.85,
				longitude: 2.35,
				declinationDeg: 2,
				gpsCourseDegrees: null,
				speedMps: null
			}
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

describe('magnetic declination cache', () => {
	afterEach(() => {
		resetMagneticDeclinationCache();
	});

	it('returns the same value for repeated lookups at the same position', async () => {
		const first = await loadMagneticDeclinationDeg(48.8566, 2.3522);
		const second = await loadMagneticDeclinationDeg(48.8566, 2.3522);
		expect(second).toBe(first);
	});

	it('reuses cache for nearby coordinates rounded to 3 decimals', async () => {
		const first = await loadMagneticDeclinationDeg(48.85661, 2.35221);
		const second = await loadMagneticDeclinationDeg(48.85664, 2.35224);
		expect(second).toBe(first);
	});

	it('returns a plausible declination for France', async () => {
		const declination = await loadMagneticDeclinationDeg(48.85, 2.35);
		expect(declination).toBeGreaterThan(-5);
		expect(declination).toBeLessThan(5);

		const trueHeading = magneticToTrueHeading(0, declination);
		expect(Math.abs(trueHeading - declination)).toBeLessThan(0.01);
	});
});

describe('pickActiveReading', () => {
	const now = 1_000_000;

	it('uses relative when absolute is stale', () => {
		const active = pickActiveReading(
			{
				reading: { heading: 10, reference: 'magnetic' },
				updatedAt: now - 600
			},
			{
				reading: { heading: 200, reference: 'magnetic' },
				updatedAt: now
			},
			now
		);
		expect(active?.heading).toBe(200);
	});

	it('prefers the most recent source when readings disagree', () => {
		const active = pickActiveReading(
			{
				reading: { heading: 10, reference: 'magnetic' },
				updatedAt: now - 100
			},
			{
				reading: { heading: 200, reference: 'magnetic' },
				updatedAt: now
			},
			now
		);
		expect(active?.heading).toBe(200);
	});

	it('keeps fresh absolute when sources agree', () => {
		const active = pickActiveReading(
			{
				reading: { heading: 45, reference: 'magnetic' },
				updatedAt: now
			},
			{
				reading: { heading: 50, reference: 'magnetic' },
				updatedAt: now - 50
			},
			now
		);
		expect(active?.heading).toBe(45);
	});
});

describe('orientation throttle', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('limits handler calls under rapid sensor events', () => {
		vi.useFakeTimers();
		const calls: number[] = [];
		const processor = createThrottledOrientationProcessor(
			(value) => calls.push(value),
			createHeadingFilterState(),
			() => EMPTY_HEADING_FUSION_CONTEXT
		);

		for (let i = 0; i < 50; i++) {
			processor({ heading: 10 + i * 0.2, reference: 'true' });
		}

		expect(calls.length).toBe(1);

		vi.advanceTimersByTime(ORIENTATION_THROTTLE_MS);
		expect(calls.length).toBe(2);

		vi.advanceTimersByTime(ORIENTATION_THROTTLE_MS * 10);
		expect(calls.length).toBeLessThanOrEqual(12);
	});
});
