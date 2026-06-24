import { describe, expect, it } from 'vitest';
import {
	getCapacitorGpsOptions,
	getGpsOptions,
	GPS_CAPTURE_OPTIONS,
	GPS_PROXIMITY_OPTIONS,
	type GpsProfile
} from './geo';

const profiles: GpsProfile[] = ['capture', 'navigation', 'watch', 'proximity'];

describe('getGpsOptions', () => {
	it('uses zero maximumAge and high accuracy for capture', () => {
		expect(getGpsOptions('capture').maximumAge).toBe(0);
		expect(getGpsOptions('capture').enableHighAccuracy).toBe(true);
	});

	it('allows short cache for navigation', () => {
		expect(getGpsOptions('navigation').maximumAge).toBe(2_000);
		expect(getGpsOptions('navigation').enableHighAccuracy).toBe(true);
	});

	it('allows moderate cache for watch', () => {
		expect(getGpsOptions('watch').maximumAge).toBe(5_000);
		expect(getGpsOptions('watch').enableHighAccuracy).toBe(true);
	});

	it('uses coarse location and long cache for proximity', () => {
		expect(getGpsOptions('proximity')).toEqual(GPS_PROXIMITY_OPTIONS);
		expect(getGpsOptions('proximity').enableHighAccuracy).toBe(false);
		expect(getGpsOptions('proximity').maximumAge).toBe(30_000);
	});

	it('defines options for every profile', () => {
		for (const profile of profiles) {
			expect(getGpsOptions(profile).timeout).toBeGreaterThan(0);
		}
	});
});

describe('getCapacitorGpsOptions', () => {
	it('requests fast updates for capture on Android', () => {
		const options = getCapacitorGpsOptions('capture');
		expect(options.minimumUpdateInterval).toBe(500);
		expect(options.interval).toBe(1_000);
		expect(options.enableLocationFallback).toBe(true);
		expect(options.timeout).toBe(GPS_CAPTURE_OPTIONS.timeout);
	});

	it('uses navigation intervals', () => {
		const options = getCapacitorGpsOptions('navigation');
		expect(options.minimumUpdateInterval).toBe(1_000);
		expect(options.interval).toBe(2_000);
	});

	it('uses lighter intervals for watch', () => {
		const options = getCapacitorGpsOptions('watch');
		expect(options.minimumUpdateInterval).toBe(2_000);
		expect(options.interval).toBe(5_000);
	});

	it('uses low-power intervals for proximity', () => {
		const options = getCapacitorGpsOptions('proximity');
		expect(options.minimumUpdateInterval).toBe(5_000);
		expect(options.interval).toBe(15_000);
		expect(options.enableHighAccuracy).toBe(false);
	});
});
