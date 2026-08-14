import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	compassHeadingFromTilt,
	createHeadingFilterState,
	createHeadingStabilityState,
	createThrottledOrientationProcessor,
	EMPTY_HEADING_FUSION_CONTEXT,
	getDeviceHeadingReading,
	HEADING_UNSTABLE_JUMP_COUNT,
	ORIENTATION_THROTTLE_MS,
	pickActiveReading,
	processHeadingSample,
	refineTrueHeading,
	resetHeadingStabilityState,
	updateHeadingStability
} from './compass';
import {
	blendHeadingsCircular,
	magneticToTrueHeading,
	shortestAngleDelta,
	smoothBearing
} from './haversine';
import {
	loadMagneticDeclinationDeg,
	resetMagneticDeclinationCache
} from './magneticDeclination';
import {
	createHeadingFusionState,
	processHeadingFusion
} from './headingFusion';

function mockOrientationEvent(
	partial: Partial<DeviceOrientationEvent> & {
		alpha: number | null;
		beta: number | null;
		gamma: number | null;
		webkitCompassHeading?: number;
		absolute?: boolean;
	}
): DeviceOrientationEvent {
	return partial as DeviceOrientationEvent;
}

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

describe('getDeviceHeadingReading', () => {
	it('tags webkitCompassHeading as true north (Safari)', () => {
		const reading = getDeviceHeadingReading(
			mockOrientationEvent({
				alpha: 10,
				beta: 0,
				gamma: 0,
				webkitCompassHeading: 42
			})
		);
		expect(reading).toEqual({ heading: 42, reference: 'true' });
	});

	it('tags absolute option / event.absolute as true north', () => {
		const fromOption = getDeviceHeadingReading(
			mockOrientationEvent({ alpha: 90, beta: 90, gamma: 0 }),
			{ absolute: true }
		);
		expect(fromOption?.reference).toBe('true');

		const fromEvent = getDeviceHeadingReading(
			mockOrientationEvent({ alpha: 90, beta: 90, gamma: 0, absolute: true })
		);
		expect(fromEvent?.reference).toBe('true');
	});

	it('tags relative orientation as magnetic', () => {
		const reading = getDeviceHeadingReading(
			mockOrientationEvent({ alpha: 90, beta: 90, gamma: 0, absolute: false })
		);
		expect(reading?.reference).toBe('magnetic');
	});

	it('keeps magnetic when absolute option is forced false even if event.absolute', () => {
		const reading = getDeviceHeadingReading(
			mockOrientationEvent({ alpha: 90, beta: 90, gamma: 0, absolute: true }),
			{ absolute: false }
		);
		expect(reading?.reference).toBe('magnetic');
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

	it('does not re-apply declination when reference is already true', () => {
		const trueHeading = 90;
		const declinationDeg = 2;
		const refined = refineTrueHeading(
			{ heading: trueHeading, reference: 'true' },
			{ ...EMPTY_HEADING_FUSION_CONTEXT, declinationDeg }
		);
		expect(refined).toBe(trueHeading);
		expect(magneticToTrueHeading(trueHeading, declinationDeg)).not.toBe(trueHeading);
	});

	it('uses headingFusion hard-switch when walking (replaces legacy fuseWithGpsCourse)', () => {
		const state = createHeadingFusionState();
		for (let i = 0; i < 30; i++) {
			processHeadingFusion(state, {
				sensorHeading: 0,
				gpsHeading: 90,
				speedMps: 2
			});
		}
		expect(state.activeSource).toBe('gps');
		expect(Math.abs(state.displayed! - 90)).toBeLessThan(15);
	});

	it('prefers sensor when stationary', () => {
		const state = createHeadingFusionState();
		processHeadingFusion(state, {
			sensorHeading: 45,
			gpsHeading: 200,
			speedMps: 0.2
		});
		expect(state.activeSource).toBe('sensor');
		expect(Math.abs(state.displayed! - 45)).toBeLessThan(5);
	});

	it('interpolates headings on the short arc', () => {
		const blended = blendHeadingsCircular(350, 10, 0.5);
		expect(Math.min(blended, 360 - blended)).toBeLessThan(20);
	});
});

describe('heading stability', () => {
	it('flags unstable after consecutive large jumps', () => {
		const state = createHeadingStabilityState();
		updateHeadingStability(state, 0);
		for (let i = 0; i < HEADING_UNSTABLE_JUMP_COUNT; i++) {
			updateHeadingStability(state, (i % 2 === 0 ? 80 : 0) as number);
		}
		expect(state.unstable).toBe(true);
	});

	it('recovers after calm samples', () => {
		const state = createHeadingStabilityState();
		updateHeadingStability(state, 0);
		updateHeadingStability(state, 90);
		updateHeadingStability(state, 0);
		updateHeadingStability(state, 90);
		expect(state.unstable).toBe(true);
		updateHeadingStability(state, 92);
		updateHeadingStability(state, 94);
		updateHeadingStability(state, 96);
		expect(state.unstable).toBe(false);
	});

	it('resets cleanly', () => {
		const state = createHeadingStabilityState();
		updateHeadingStability(state, 0);
		updateHeadingStability(state, 90);
		resetHeadingStabilityState(state);
		expect(state.lastHeading).toBeNull();
		expect(state.jumpStreak).toBe(0);
		expect(state.unstable).toBe(false);
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
				reading: { heading: 10, reference: 'true' },
				updatedAt: now - 600
			},
			{
				reading: { heading: 200, reference: 'magnetic' },
				updatedAt: now
			},
			now
		);
		expect(active?.heading).toBe(200);
		expect(active?.reference).toBe('magnetic');
	});

	it('prefers the most recent source when readings disagree', () => {
		const active = pickActiveReading(
			{
				reading: { heading: 10, reference: 'true' },
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
				reading: { heading: 45, reference: 'true' },
				updatedAt: now
			},
			{
				reading: { heading: 50, reference: 'magnetic' },
				updatedAt: now - 50
			},
			now
		);
		expect(active?.heading).toBe(45);
		expect(active?.reference).toBe('true');
	});
});

describe('orientation throttle', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('limits handler calls under rapid sensor events', () => {
		vi.useFakeTimers();
		const calls: Array<{ heading: number; reference: string }> = [];
		const processor = createThrottledOrientationProcessor(
			(value) => calls.push(value),
			createHeadingFilterState()
		);

		for (let i = 0; i < 50; i++) {
			processor({ heading: 10 + i * 0.2, reference: 'true' });
		}

		expect(calls.length).toBe(1);
		expect(calls[0].reference).toBe('true');

		vi.advanceTimersByTime(ORIENTATION_THROTTLE_MS);
		expect(calls.length).toBe(2);

		vi.advanceTimersByTime(ORIENTATION_THROTTLE_MS * 10);
		expect(calls.length).toBeLessThanOrEqual(12);
	});

	it('preserves magnetic reference through the filter', () => {
		vi.useFakeTimers();
		const calls: Array<{ heading: number; reference: string }> = [];
		const processor = createThrottledOrientationProcessor(
			(value) => calls.push(value),
			createHeadingFilterState()
		);

		processor({ heading: 30, reference: 'magnetic' });
		expect(calls[0]).toEqual({ heading: 30, reference: 'magnetic' });
	});
});
