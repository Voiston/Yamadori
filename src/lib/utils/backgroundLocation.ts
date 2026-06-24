import * as m from '$lib/paraglide/messages.js';
import { registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import type { LocationReading } from '$lib/utils/locationProvider';
import { isAndroidApp } from '$lib/utils/platform';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export type BackgroundWatchHandle = {
	id: string;
};

let activeWatcherId: string | null = null;

function fromBackgroundLocation(location: {
	latitude: number;
	longitude: number;
	accuracy: number;
	altitude: number | null;
	bearing: number | null;
	speed: number | null;
	time: number | null;
}): LocationReading {
	return {
		latitude: location.latitude,
		longitude: location.longitude,
		accuracyMeters: location.accuracy ?? null,
		altitudeMeters: location.altitude ?? null,
		heading:
			location.bearing !== null && !Number.isNaN(location.bearing) && location.bearing >= 0
				? location.bearing
				: null,
		speedMps:
			location.speed !== null && !Number.isNaN(location.speed) && location.speed >= 0
				? location.speed
				: null,
		timestamp: location.time ?? Date.now()
	};
}

export function isBackgroundLocationSupported(): boolean {
	return isAndroidApp();
}

export async function startBackgroundWatching(
	onUpdate: (reading: LocationReading) => void,
	onError: (message: string) => void
): Promise<BackgroundWatchHandle> {
	if (!isBackgroundLocationSupported()) {
		throw new Error(m.location_bg_unsupported());
	}

	await stopBackgroundWatching();

	const id = await BackgroundGeolocation.addWatcher(
		{
			backgroundMessage: m.location_bg_message(),
			backgroundTitle: m.location_bg_title(),
			requestPermissions: true,
			stale: false,
			distanceFilter: 20
		},
		(location, error) => {
			if (error) {
				if (error.code === 'NOT_AUTHORIZED') {
					onError(m.location_bg_denied());
					return;
				}
				onError(error.message || m.location_unavailable_short());
				return;
			}
			if (location) {
				onUpdate(fromBackgroundLocation(location));
			}
		}
	);

	activeWatcherId = id;
	return { id };
}

export async function stopBackgroundWatching(): Promise<void> {
	if (!activeWatcherId) {
		return;
	}

	await BackgroundGeolocation.removeWatcher({ id: activeWatcherId });
	activeWatcherId = null;
}

export async function openBackgroundLocationSettings(): Promise<void> {
	if (!isBackgroundLocationSupported()) {
		return;
	}
	await BackgroundGeolocation.openSettings();
}

export function isBackgroundWatching(): boolean {
	return activeWatcherId !== null;
}
