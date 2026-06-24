import { describe, expect, it } from 'vitest';
import {
	createHeadingFusionState,
	GPS_DOMINANT_SPEED_MPS,
	HEADING_LOW_PASS_ALPHA,
	isGpsDominant,
	lowPassHeadingCircular,
	processHeadingFusion,
	resetHeadingFusionState
} from './headingFusion';
import { normalizeAngle } from './haversine';

describe('lowPassHeadingCircular', () => {
	it('returns raw heading when no previous value', () => {
		expect(lowPassHeadingCircular(null, 90, HEADING_LOW_PASS_ALPHA)).toBe(90);
	});

	it('absorbs micro-variations', () => {
		const first = lowPassHeadingCircular(null, 10, HEADING_LOW_PASS_ALPHA);
		const second = lowPassHeadingCircular(first, 12, HEADING_LOW_PASS_ALPHA);
		expect(Math.abs(second - 12)).toBeLessThan(2);
		expect(Math.abs(second - 10)).toBeGreaterThan(0);
	});
});

describe('isGpsDominant', () => {
	it('is false below threshold', () => {
		expect(isGpsDominant(1.49)).toBe(false);
		expect(isGpsDominant(null)).toBe(false);
	});

	it('is true at and above threshold', () => {
		expect(isGpsDominant(GPS_DOMINANT_SPEED_MPS)).toBe(true);
		expect(isGpsDominant(1.51)).toBe(true);
	});
});

describe('processHeadingFusion', () => {
	it('uses sensor when speed is below threshold', () => {
		const state = createHeadingFusionState();
		const heading = processHeadingFusion(state, {
			sensorHeading: 45,
			gpsHeading: 200,
			speedMps: 1.0
		});
		expect(heading).not.toBeNull();
		expect(state.activeSource).toBe('sensor');
		expect(Math.abs(normalizeAngle(heading! - 45))).toBeLessThan(5);
	});

	it('switches to GPS above threshold', () => {
		const state = createHeadingFusionState();
		processHeadingFusion(state, {
			sensorHeading: 45,
			gpsHeading: 200,
			speedMps: 1.0
		});
		for (let i = 0; i < 30; i++) {
			processHeadingFusion(state, {
				sensorHeading: 45,
				gpsHeading: 200,
				speedMps: 1.51
			});
		}
		expect(state.activeSource).toBe('gps');
		expect(Math.abs(normalizeAngle(state.displayed! - 200))).toBeLessThan(15);
	});

	it('transitions smoothly when slowing down', () => {
		const state = createHeadingFusionState();
		for (let i = 0; i < 40; i++) {
			processHeadingFusion(state, {
				sensorHeading: 45,
				gpsHeading: 200,
				speedMps: 2.0
			});
		}
		const beforeSlowdown = state.displayed!;

		for (let i = 0; i < 3; i++) {
			processHeadingFusion(state, {
				sensorHeading: 45,
				gpsHeading: 200,
				speedMps: 0.5
			});
		}

		const delta = Math.abs(normalizeAngle(state.displayed! - beforeSlowdown));
		expect(delta).toBeLessThan(60);
		expect(state.activeSource).toBe('sensor');
	});

	it('falls back to sensor when GPS heading is null at high speed', () => {
		const state = createHeadingFusionState();
		processHeadingFusion(state, {
			sensorHeading: 90,
			gpsHeading: null,
			speedMps: 3.0
		});
		expect(state.activeSource).toBe('sensor');
		expect(state.displayed).not.toBeNull();
	});

	it('can be reset', () => {
		const state = createHeadingFusionState();
		processHeadingFusion(state, {
			sensorHeading: 90,
			gpsHeading: 180,
			speedMps: 2.0
		});
		resetHeadingFusionState(state);
		expect(state.smoothedSensor).toBeNull();
		expect(state.displayed).toBeNull();
		expect(state.activeSource).toBe('sensor');
	});
});
