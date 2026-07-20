import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const locationMocks = vi.hoisted(() => ({
	isLocationSupported: vi.fn(),
	requestLocationPermissions: vi.fn(),
	startWatching: vi.fn(),
	stopWatching: vi.fn(),
	getLocationPermissionStatus: vi.fn(),
	readCurrentPosition: vi.fn()
}));

vi.mock('$lib/paraglide/messages.js', () => ({
	geo_not_supported: () => 'Geolocation unsupported'
}));

vi.mock('$lib/utils/locationProvider', () => ({
	isLocationSupported: (...args: unknown[]) => locationMocks.isLocationSupported(...args),
	requestLocationPermissions: (...args: unknown[]) =>
		locationMocks.requestLocationPermissions(...args),
	startWatching: (...args: unknown[]) => locationMocks.startWatching(...args),
	stopWatching: (...args: unknown[]) => locationMocks.stopWatching(...args),
	getLocationPermissionStatus: (...args: unknown[]) =>
		locationMocks.getLocationPermissionStatus(...args),
	getCurrentPosition: (...args: unknown[]) => locationMocks.readCurrentPosition(...args),
	geolocationErrorMessage: (error: unknown) =>
		error instanceof Error ? error.message : 'geo_error',
	locationPermissionErrorMessage: () => 'permission_denied'
}));

vi.mock('$lib/utils/cameraCaptureSession', () => ({
	shouldDeferGpsSyncForCamera: vi.fn().mockReturnValue(false),
	registerCameraSessionDeferredHandlers: vi.fn()
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: vi.fn().mockReturnValue(false)
}));

vi.mock('@capacitor/app', () => ({
	App: {
		addListener: vi.fn().mockResolvedValue({ remove: vi.fn() })
	}
}));

vi.mock('$lib/stores/powerSavingMode.svelte', () => ({
	powerSavingModeState: { active: false }
}));

import {
	__checkGpsStaleForTests,
	__checkLiveGpsRefreshForTests,
	__resetUserPositionForTests,
	acquireLocationWatch,
	getActiveWatchProfile,
	getLastGpsUpdateAt,
	getPublishedUserPosition,
	getSmoothedAltitudeMeters,
	releaseLocationWatch,
	resetPositionSmoothing,
	stopWatchingPosition,
	userPositionState
} from './userPosition.svelte';
import type { LocationReading } from '$lib/utils/locationProvider';

const sampleReading = (overrides: Partial<LocationReading> = {}): LocationReading => ({
	latitude: 48.8566,
	longitude: 2.3522,
	accuracyMeters: 8,
	altitudeMeters: null,
	heading: null,
	speedMps: null,
	timestamp: Date.now(),
	...overrides
});

describe('userPosition watch lifecycle', () => {
	beforeEach(() => {
		__resetUserPositionForTests();
		locationMocks.isLocationSupported.mockReturnValue(true);
		locationMocks.requestLocationPermissions.mockResolvedValue(true);
		locationMocks.startWatching.mockResolvedValue({ id: 'watch-1' });
		locationMocks.stopWatching.mockResolvedValue(undefined);
	});

	afterEach(async () => {
		await stopWatchingPosition();
		__resetUserPositionForTests();
	});

	it('reflects the active consumer profile after acquire', async () => {
		const release = acquireLocationWatch('map', 'navigation');

		await vi.waitFor(() => {
			expect(getActiveWatchProfile()).toBe('navigation');
		});

		release();
		await stopWatchingPosition();

		expect(getActiveWatchProfile()).toBeNull();
	});
});

describe('userPosition publish helpers', () => {
	beforeEach(() => {
		__resetUserPositionForTests();
	});

	it('clears published position and smoothing state', () => {
		resetPositionSmoothing();

		expect(getPublishedUserPosition()).toBeNull();
		expect(getSmoothedAltitudeMeters()).toBeNull();
	});
});

describe('userPosition stale recovery', () => {
	let watchOnUpdate: ((reading: LocationReading) => void) | null = null;

	beforeEach(() => {
		__resetUserPositionForTests();
		watchOnUpdate = null;
		locationMocks.isLocationSupported.mockReturnValue(true);
		locationMocks.requestLocationPermissions.mockResolvedValue(true);
		locationMocks.getLocationPermissionStatus.mockResolvedValue('granted');
		locationMocks.startWatching.mockImplementation(
			async (onUpdate: (reading: LocationReading) => void) => {
				watchOnUpdate = onUpdate;
				return { id: 'watch-1', mode: 'web' };
			}
		);
		locationMocks.stopWatching.mockResolvedValue(undefined);
		locationMocks.readCurrentPosition.mockResolvedValue(sampleReading({ accuracyMeters: 5 }));
	});

	afterEach(async () => {
		vi.useRealTimers();
		await stopWatchingPosition();
		__resetUserPositionForTests();
	});

	it('restarts the watch after a stale fix without resetting recovery stage', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		acquireLocationWatch('compass', 'watch');

		await vi.waitFor(() => {
			expect(userPositionState.watching).toBe(true);
			expect(watchOnUpdate).not.toBeNull();
		});

		watchOnUpdate?.(sampleReading());
		const initialStartCount = locationMocks.startWatching.mock.calls.length;

		vi.setSystemTime(startedAt + 13_000);
		await __checkGpsStaleForTests();

		expect(locationMocks.readCurrentPosition).toHaveBeenCalledTimes(1);
		expect(getLastGpsUpdateAt()).not.toBeNull();

		vi.setSystemTime(startedAt + 26_000);
		await __checkGpsStaleForTests();

		expect(locationMocks.stopWatching).toHaveBeenCalled();
		expect(locationMocks.startWatching.mock.calls.length).toBeGreaterThan(initialStartCount);
	});

	it('runs stale recovery for capture profile', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		acquireLocationWatch('capture-form', 'capture');

		await vi.waitFor(() => {
			expect(userPositionState.watching).toBe(true);
			expect(watchOnUpdate).not.toBeNull();
		});

		watchOnUpdate?.(sampleReading());

		vi.setSystemTime(startedAt + 6_000);
		await __checkGpsStaleForTests();

		expect(locationMocks.readCurrentPosition).toHaveBeenCalled();
	});
});

describe('userPosition live refresh', () => {
	let watchOnUpdate: ((reading: LocationReading) => void) | null = null;

	beforeEach(() => {
		__resetUserPositionForTests();
		watchOnUpdate = null;
		locationMocks.isLocationSupported.mockReturnValue(true);
		locationMocks.requestLocationPermissions.mockResolvedValue(true);
		locationMocks.getLocationPermissionStatus.mockResolvedValue('granted');
		locationMocks.startWatching.mockImplementation(
			async (onUpdate: (reading: LocationReading) => void) => {
				watchOnUpdate = onUpdate;
				return { id: 'watch-1', mode: 'web' };
			}
		);
		locationMocks.stopWatching.mockResolvedValue(undefined);
		locationMocks.readCurrentPosition.mockResolvedValue(sampleReading({ accuracyMeters: 5 }));
	});

	afterEach(async () => {
		vi.useRealTimers();
		await stopWatchingPosition();
		__resetUserPositionForTests();
	});

	it('requests a proactive fix when updates go quiet on capture', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		acquireLocationWatch('capture-form', 'capture');

		await vi.waitFor(() => {
			expect(userPositionState.watching).toBe(true);
		});

		watchOnUpdate?.(sampleReading());

		vi.setSystemTime(startedAt + 3_000);
		await __checkLiveGpsRefreshForTests();

		expect(locationMocks.readCurrentPosition).toHaveBeenCalled();
	});

	it('does not refresh capture while watch updates are still fresh', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		acquireLocationWatch('capture-form', 'capture');

		await vi.waitFor(() => {
			expect(userPositionState.watching).toBe(true);
		});

		watchOnUpdate?.(sampleReading());
		locationMocks.readCurrentPosition.mockClear();

		vi.setSystemTime(startedAt + 1_000);
		await __checkLiveGpsRefreshForTests();

		expect(locationMocks.readCurrentPosition).not.toHaveBeenCalled();
	});

	it('starts compass live refresh without restarting hardware watch on same profile', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		acquireLocationWatch('topo-map', 'watch');

		await vi.waitFor(() => {
			expect(userPositionState.watching).toBe(true);
			expect(watchOnUpdate).not.toBeNull();
		});

		watchOnUpdate?.(sampleReading());
		const initialStartCount = locationMocks.startWatching.mock.calls.length;
		locationMocks.readCurrentPosition.mockClear();

		acquireLocationWatch('compass', 'watch');

		await vi.waitFor(() => {
			expect(getActiveWatchProfile()).toBe('watch');
		});

		expect(locationMocks.startWatching.mock.calls.length).toBe(initialStartCount);

		vi.setSystemTime(startedAt + 7_000);
		await __checkLiveGpsRefreshForTests();

		expect(locationMocks.readCurrentPosition).toHaveBeenCalledTimes(1);
	});

	it('re-arms compass watch when acquired during map release sync', async () => {
		const startedAt = Date.now();
		vi.setSystemTime(startedAt);

		let resolveStop: (() => void) | undefined;
		let stopStarted = false;
		locationMocks.stopWatching.mockImplementation(async (handle: unknown) => {
			if (!handle) {
				return;
			}
			stopStarted = true;
			await new Promise<void>((resolve) => {
				resolveStop = resolve;
			});
		});

		try {
			acquireLocationWatch('topo-map', 'proximity');

			await vi.waitFor(() => {
				expect(userPositionState.watching).toBe(true);
				expect(watchOnUpdate).not.toBeNull();
			});

			watchOnUpdate?.(sampleReading());

			releaseLocationWatch('topo-map');
			await vi.waitFor(() => {
				expect(stopStarted).toBe(true);
			});

			acquireLocationWatch('compass', 'watch');

			resolveStop?.();

			await vi.waitFor(() => {
				expect(userPositionState.watching).toBe(true);
				expect(getActiveWatchProfile()).toBe('watch');
			});

			expect(locationMocks.startWatching.mock.calls.length).toBeGreaterThanOrEqual(2);

			locationMocks.readCurrentPosition.mockClear();
			vi.setSystemTime(startedAt + 12_000);
			await __checkLiveGpsRefreshForTests();

			expect(locationMocks.readCurrentPosition).toHaveBeenCalledTimes(1);
		} finally {
			resolveStop?.();
			locationMocks.stopWatching.mockResolvedValue(undefined);
		}
	});
});
