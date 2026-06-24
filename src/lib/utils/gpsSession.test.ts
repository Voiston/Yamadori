import { describe, expect, it } from 'vitest';
import type { GpsProfile } from '$lib/utils/geo';
import {
	acquireConsumer,
	releaseConsumer,
	resolveActiveProfile,
	resolveGpsStaleRecovery,
	GPS_NAVIGATION_STALE_MS,
	shouldSuspendForAppBackground,
	shouldUseBackgroundWatch
} from '$lib/utils/gpsSession';

describe('resolveActiveProfile', () => {
	it('returns null when no consumers are active', () => {
		expect(resolveActiveProfile(new Map())).toBeNull();
	});

	it('picks the most demanding profile among consumers', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, 'home', 'proximity');
		acquireConsumer(consumers, 'map', 'watch');
		expect(resolveActiveProfile(consumers)).toBe('watch');

		acquireConsumer(consumers, 'compass', 'navigation');
		expect(resolveActiveProfile(consumers)).toBe('navigation');

		acquireConsumer(consumers, 'capture', 'capture');
		expect(resolveActiveProfile(consumers)).toBe('capture');
	});

	it('keeps watch active until the last consumer is released', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, 'a', 'watch');
		acquireConsumer(consumers, 'b', 'proximity');
		releaseConsumer(consumers, 'a');
		expect(resolveActiveProfile(consumers)).toBe('proximity');
		releaseConsumer(consumers, 'b');
		expect(resolveActiveProfile(consumers)).toBeNull();
	});

	it('updates profile when a consumer changes demand', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, 'capture-form', 'capture');
		acquireConsumer(consumers, 'capture-form', 'proximity');
		expect(resolveActiveProfile(consumers)).toBe('proximity');
	});
});

describe('shouldSuspendForAppBackground', () => {
	it('pauses foreground GPS when the app is backgrounded without opt-in tracking', () => {
		expect(shouldSuspendForAppBackground(true, false)).toBe(true);
		expect(shouldSuspendForAppBackground(true, true)).toBe(false);
		expect(shouldSuspendForAppBackground(false, false)).toBe(false);
	});
});

describe('shouldUseBackgroundWatch', () => {
	it('requires explicit background opt-in and platform support', () => {
		expect(shouldUseBackgroundWatch('watch', false, true)).toBe(false);
		expect(shouldUseBackgroundWatch('watch', true, false)).toBe(false);
		expect(shouldUseBackgroundWatch('watch', true, true)).toBe(true);
	});

	it('does not use background mode for capture', () => {
		expect(shouldUseBackgroundWatch('capture', true, true)).toBe(false);
	});
});

describe('resolveGpsStaleRecovery', () => {
	const threshold = GPS_NAVIGATION_STALE_MS;

	it('does nothing while updates are fresh', () => {
		expect(resolveGpsStaleRecovery(threshold - 1, threshold, false)).toBe('none');
	});

	it('requests a fix on the first stale cycle', () => {
		expect(resolveGpsStaleRecovery(threshold, threshold, false)).toBe('request-fix');
		expect(resolveGpsStaleRecovery(threshold + 5_000, threshold, false)).toBe('request-fix');
	});

	it('restarts the watch when still stale after a fix was requested', () => {
		expect(resolveGpsStaleRecovery(threshold, threshold, true)).toBe('restart-watch');
	});
});
