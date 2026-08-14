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
