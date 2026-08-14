import { describe, expect, it } from 'vitest';
import type { GpsProfile } from '$lib/utils/geo';
import {
	acquireConsumer,
	capProfileForPowerSaving,
	COMPASS_GPS_CONSUMER_ID,
	releaseConsumer,
	resolveActiveProfile,
	resolveGpsLiveRefreshThresholdMs,
	resolveGpsStaleRecovery,
	resolveGpsStaleThresholdMs,
	GPS_NAVIGATION_STALE_MS,
	shouldRunGpsStaleWatchdog,
	shouldRunLiveGpsRefresh,
	shouldSuspendForAppBackground
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
	it('pauses GPS when the app is backgrounded', () => {
		expect(shouldSuspendForAppBackground(true)).toBe(true);
		expect(shouldSuspendForAppBackground(false)).toBe(false);
	});
});

describe('capProfileForPowerSaving', () => {
	it('caps navigation and watch to proximity', () => {
		expect(capProfileForPowerSaving('navigation')).toBe('proximity');
		expect(capProfileForPowerSaving('watch')).toBe('proximity');
	});

	it('leaves capture and proximity unchanged', () => {
		expect(capProfileForPowerSaving('capture')).toBe('capture');
		expect(capProfileForPowerSaving('proximity')).toBe('proximity');
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

describe('shouldRunGpsStaleWatchdog', () => {
	it('runs for navigation profile', () => {
		const consumers = new Map<string, GpsProfile>();
		expect(shouldRunGpsStaleWatchdog('navigation', consumers)).toBe(true);
	});

	it('runs for capture profile', () => {
		const consumers = new Map<string, GpsProfile>();
		expect(shouldRunGpsStaleWatchdog('capture', consumers)).toBe(true);
	});

	it('runs when compass consumer is active even on watch profile', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, COMPASS_GPS_CONSUMER_ID, 'watch');
		expect(shouldRunGpsStaleWatchdog('watch', consumers)).toBe(true);
	});

	it('does not run for home list watch without compass', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, 'home-list', 'proximity');
		expect(shouldRunGpsStaleWatchdog('proximity', consumers)).toBe(false);
	});
});

describe('resolveGpsStaleThresholdMs', () => {
	it('returns profile-specific stale thresholds', () => {
		expect(resolveGpsStaleThresholdMs('capture')).toBe(5_000);
		expect(resolveGpsStaleThresholdMs('navigation')).toBe(GPS_NAVIGATION_STALE_MS);
		expect(resolveGpsStaleThresholdMs('watch')).toBe(12_000);
		expect(resolveGpsStaleThresholdMs('proximity')).toBe(20_000);
	});
});

describe('shouldRunLiveGpsRefresh', () => {
	it('runs for capture and navigation profiles', () => {
		const consumers = new Map<string, GpsProfile>();
		expect(shouldRunLiveGpsRefresh('capture', consumers)).toBe(true);
		expect(shouldRunLiveGpsRefresh('navigation', consumers)).toBe(true);
	});

	it('runs when compass consumer is active', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, COMPASS_GPS_CONSUMER_ID, 'watch');
		expect(shouldRunLiveGpsRefresh('watch', consumers)).toBe(true);
	});

	it('does not run for home list proximity without compass', () => {
		const consumers = new Map<string, GpsProfile>();
		acquireConsumer(consumers, 'home-list', 'proximity');
		expect(shouldRunLiveGpsRefresh('proximity', consumers)).toBe(false);
	});
});

describe('resolveGpsLiveRefreshThresholdMs', () => {
	it('returns half of the stale threshold', () => {
		expect(resolveGpsLiveRefreshThresholdMs('capture')).toBe(2_500);
		expect(resolveGpsLiveRefreshThresholdMs('navigation')).toBe(5_000);
		expect(resolveGpsLiveRefreshThresholdMs('watch')).toBe(6_000);
		expect(resolveGpsLiveRefreshThresholdMs('proximity')).toBe(10_000);
	});
});
