import { App } from '@capacitor/app';
import { DeviceOrientation } from 'capacitor-community-device-orientation';
import type { DeviceOrientationData } from 'capacitor-community-device-orientation';
import {
	createThrottledCallback,
	subscribeDeviceOrientation,
	requestOrientationPermission as requestWebOrientationPermission,
	type DeviceHeadingReading
} from '$lib/utils/compass';
import { normalizeHeading360 } from '$lib/utils/haversine';
import { isNativeApp } from '$lib/utils/platform';
import { Capacitor } from '@capacitor/core';

export type HeadingSample = DeviceHeadingReading;

function readingFromNativeData(data: DeviceOrientationData): HeadingSample | null {
	if (data.fused?.heading !== undefined) {
		return { heading: normalizeHeading360(data.fused.heading), reference: 'true' };
	}

	if (data.orientation?.azimuth !== undefined) {
		const reference: HeadingSample['reference'] =
			Capacitor.getPlatform() === 'android' ? 'magnetic' : 'true';
		return { heading: normalizeHeading360(data.orientation.azimuth), reference };
	}

	return null;
}

function subscribeNativeFusedHeading(onSample: (sample: HeadingSample) => void): () => void {
	let watchId: string | null = null;
	let stopped = false;
	const emitSample = createThrottledCallback(onSample);

	void DeviceOrientation.watchOrientation(
		(data) => {
			if (stopped) {
				return;
			}
			const reading = readingFromNativeData(data);
			if (reading) {
				emitSample(reading);
			}
		},
		{ frequency: 'default' }
	).then((id) => {
		if (stopped) {
			void DeviceOrientation.clearWatch({ id });
			return;
		}
		watchId = id;
	});

	return () => {
		stopped = true;
		if (watchId) {
			void DeviceOrientation.clearWatch({ id: watchId });
			watchId = null;
		}
	};
}

/**
 * Subscribe to fused device heading.
 * Web path preserves true/magnetic reference from the orientation pipeline
 * (do not override — UI applies WMM declination only when magnetic).
 */
export function subscribeFusedHeading(onSample: (sample: HeadingSample) => void): () => void {
	if (isNativeApp()) {
		return subscribeNativeFusedHeading(onSample);
	}

	return subscribeDeviceOrientation(onSample);
}

export async function requestFusedHeadingPermission(): Promise<boolean> {
	if (isNativeApp()) {
		return true;
	}
	return requestWebOrientationPermission();
}

export type WatchFusedHeadingHandlers = {
	onSample: (sample: HeadingSample) => void;
	onPause?: () => void;
	onDenied?: () => void;
};

/**
 * Request heading permission, subscribe while the app is visible/active,
 * and pause when backgrounded. Returns a teardown function.
 */
export function watchFusedHeading(handlers: WatchFusedHeadingHandlers): () => void {
	let stop: (() => void) | null = null;
	let cancelled = false;
	let permissionGranted = false;
	let appActive = typeof document === 'undefined' || document.visibilityState === 'visible';

	const startSubscription = () => {
		if (cancelled || !permissionGranted || !appActive || stop) {
			return;
		}
		stop = subscribeFusedHeading(handlers.onSample);
	};

	const pauseSubscription = () => {
		stop?.();
		stop = null;
		handlers.onPause?.();
	};

	const handleAppActiveChange = (isActive: boolean) => {
		appActive = isActive;
		if (appActive) {
			startSubscription();
		} else {
			pauseSubscription();
		}
	};

	const handleVisibilityChange = () => {
		if (typeof document === 'undefined') {
			return;
		}
		handleAppActiveChange(document.visibilityState === 'visible');
	};

	void requestFusedHeadingPermission().then((granted) => {
		if (cancelled) {
			return;
		}
		if (!granted) {
			handlers.onDenied?.();
			return;
		}
		permissionGranted = true;
		startSubscription();
	});

	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', handleVisibilityChange);
	}

	let removeAppListener: (() => void) | undefined;
	if (isNativeApp()) {
		void App.addListener('appStateChange', ({ isActive }) => {
			handleAppActiveChange(isActive);
		}).then((handle) => {
			if (cancelled) {
				void handle.remove();
				return;
			}
			removeAppListener = () => {
				void handle.remove();
			};
		});
	}

	return () => {
		cancelled = true;
		if (typeof document !== 'undefined') {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		}
		removeAppListener?.();
		pauseSubscription();
	};
}
