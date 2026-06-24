import { DeviceOrientation } from 'capacitor-community-device-orientation';
import type { DeviceOrientationData } from 'capacitor-community-device-orientation';
import {
	createThrottledCallback,
	EMPTY_HEADING_FUSION_CONTEXT,
	subscribeDeviceOrientation,
	requestOrientationPermission as requestWebOrientationPermission,
	type HeadingFusionContext
} from '$lib/utils/compass';
import { normalizeHeading360 } from '$lib/utils/haversine';
import { isNativeApp } from '$lib/utils/platform';
import { Capacitor } from '@capacitor/core';

export type HeadingSample = {
	heading: number;
	reference: 'true' | 'magnetic';
};

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

export function subscribeFusedHeading(
	onSample: (sample: HeadingSample) => void,
	getContext: () => HeadingFusionContext = () => EMPTY_HEADING_FUSION_CONTEXT
): () => void {
	if (isNativeApp()) {
		return subscribeNativeFusedHeading(onSample);
	}

	return subscribeDeviceOrientation(
		(heading) => {
			onSample({ heading, reference: 'magnetic' });
		},
		getContext
	);
}

export async function requestFusedHeadingPermission(): Promise<boolean> {
	if (isNativeApp()) {
		return true;
	}
	return requestWebOrientationPermission();
}
