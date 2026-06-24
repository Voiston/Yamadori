import * as m from '$lib/paraglide/messages.js';
import { Geolocation } from '@capacitor/geolocation';
import {
	getCapacitorGpsOptions,
	getGpsOptions,
	profileFromPurpose,
	type GpsProfile,
	type GpsPurpose
} from '$lib/utils/geo';
import { isNativeApp } from '$lib/utils/platform';

export type LocationReading = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
	heading: number | null;
	speedMps: number | null;
	timestamp: number;
};

export type LocationWatchHandle = {
	id: string;
	mode: 'web' | 'capacitor';
};

export type LocationPermissionStatus = 'granted' | 'coarse-only' | 'denied' | 'unsupported';

const GEOLOCATION_PERMISSION_DENIED = 1;

export function geolocationErrorMessage(error: unknown): string {
	if (error && typeof error === 'object' && 'code' in error) {
		const code = (error as GeolocationPositionError).code;
		if (code === GEOLOCATION_PERMISSION_DENIED) {
			return m.location_denied_yrs_required();
		}
	}
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return m.location_unavailable();
}

export function locationPermissionErrorMessage(status: LocationPermissionStatus): string {
	switch (status) {
		case 'coarse-only':
			return m.location_precise_required();
		case 'denied':
			return m.location_denied_yrs_required();
		case 'unsupported':
			return m.location_unsupported();
		default:
			return m.location_unavailable();
	}
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
	if (!isLocationSupported()) {
		return 'unsupported';
	}

	if (!isNativeApp()) {
		return 'granted';
	}

	try {
		const status = await Geolocation.checkPermissions();
		if (status.location === 'granted') {
			return 'granted';
		}
		if (status.coarseLocation === 'granted') {
			return 'coarse-only';
		}
		return 'denied';
	} catch {
		return 'denied';
	}
}

export function isLocationSupported(): boolean {
	if (isNativeApp()) {
		return true;
	}
	return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export async function requestLocationPermissions(): Promise<boolean> {
	if (!isNativeApp()) {
		return isLocationSupported();
	}

	try {
		const status = await Geolocation.requestPermissions({ permissions: ['location'] });
		return status.location === 'granted';
	} catch {
		return false;
	}
}

function fromGeolocationPosition(position: GeolocationPosition): LocationReading {
	const { coords, timestamp } = position;
	return {
		latitude: coords.latitude,
		longitude: coords.longitude,
		accuracyMeters: coords.accuracy ?? null,
		altitudeMeters: coords.altitude ?? null,
		heading:
			coords.heading !== null && !Number.isNaN(coords.heading) && coords.heading >= 0
				? coords.heading
				: null,
		speedMps:
			coords.speed !== null && !Number.isNaN(coords.speed) && coords.speed >= 0
				? coords.speed
				: null,
		timestamp
	};
}

function fromCapacitorPosition(position: {
	coords: {
		latitude: number;
		longitude: number;
		accuracy: number;
		altitude: number | null;
		heading: number | null;
		speed: number | null;
	};
	timestamp: number;
}): LocationReading {
	const { coords, timestamp } = position;
	return {
		latitude: coords.latitude,
		longitude: coords.longitude,
		accuracyMeters: coords.accuracy ?? null,
		altitudeMeters: coords.altitude ?? null,
		heading:
			coords.heading !== null && !Number.isNaN(coords.heading) && coords.heading >= 0
				? coords.heading
				: null,
		speedMps:
			coords.speed !== null && !Number.isNaN(coords.speed) && coords.speed >= 0
				? coords.speed
				: null,
		timestamp
	};
}

function toCapacitorOptions(profile: GpsProfile) {
	return getCapacitorGpsOptions(profile);
}

function resolveProfile(profileOrPurpose: GpsProfile | GpsPurpose): GpsProfile {
	if (profileOrPurpose === 'capture' || profileOrPurpose === 'watch') {
		return profileFromPurpose(profileOrPurpose);
	}
	return profileOrPurpose;
}

export async function getCurrentPosition(
	profileOrPurpose: GpsProfile | GpsPurpose = 'capture'
): Promise<LocationReading> {
	const profile = resolveProfile(profileOrPurpose);
	if (!isLocationSupported()) {
		throw new Error(m.location_unsupported());
	}

	if (isNativeApp()) {
		const position = await Geolocation.getCurrentPosition(toCapacitorOptions(profile));
		return fromCapacitorPosition(position);
	}

	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(
			(position) => resolve(fromGeolocationPosition(position)),
			(err) => reject(new Error(geolocationErrorMessage(err))),
			getGpsOptions(profile)
		);
	});
}

export async function startWatching(
	onUpdate: (reading: LocationReading) => void,
	onError: (message: string) => void,
	profileOrPurpose: GpsProfile | GpsPurpose = 'watch'
): Promise<LocationWatchHandle> {
	const profile = resolveProfile(profileOrPurpose);
	if (!isLocationSupported()) {
		throw new Error(m.location_unsupported());
	}

	if (isNativeApp()) {
		const id = await Geolocation.watchPosition(toCapacitorOptions(profile), (position, err) => {
			if (err) {
				onError(err.message || 'Position indisponible');
				return;
			}
			if (position) {
				onUpdate(fromCapacitorPosition(position));
			}
		});
		return { id, mode: 'capacitor' };
	}

	const watchId = navigator.geolocation.watchPosition(
		(position) => onUpdate(fromGeolocationPosition(position)),
		(err) => onError(geolocationErrorMessage(err)),
		getGpsOptions(profile)
	);

	return { id: String(watchId), mode: 'web' };
}

export async function stopWatching(handle: LocationWatchHandle | null): Promise<void> {
	if (!handle) {
		return;
	}

	if (handle.mode === 'capacitor') {
		await Geolocation.clearWatch({ id: handle.id });
		return;
	}

	navigator.geolocation.clearWatch(Number(handle.id));
}
