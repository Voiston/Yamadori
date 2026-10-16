import { Geolocation } from '@capacitor/geolocation';
import { formatErrorToast, UserFacingError, type ErrorCopy } from '$lib/utils/userFacingError';
import {
	geolocationErrorCopy,
	locationPermissionErrorCopy,
	locationUnsupportedCopy
} from '$lib/utils/errorCopy';
import {
	getCapacitorGpsFixOptions,
	getCapacitorGpsOptions,
	getGpsFixOptions,
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

export type LocationPermissionStatus =
	| 'granted'
	| 'coarse-only'
	| 'prompt'
	| 'denied'
	| 'unsupported';

const GEOLOCATION_PERMISSION_DENIED = 1;
const GEOLOCATION_POSITION_UNAVAILABLE = 2;
const GEOLOCATION_TIMEOUT = 3;

export function geolocationErrorMessage(error: unknown): string {
	return formatErrorToast(geolocationErrorCopy(error));
}

export function locationPermissionErrorMessage(status: LocationPermissionStatus): string {
	return formatErrorToast(locationPermissionErrorCopy(status));
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
		if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
			return 'prompt';
		}
		if (
			status.coarseLocation === 'prompt' ||
			status.coarseLocation === 'prompt-with-rationale'
		) {
			return 'prompt';
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

function toCapacitorWatchOptions(profile: GpsProfile) {
	return getCapacitorGpsOptions(profile);
}

function toCapacitorFixOptions(profile: GpsProfile) {
	return getCapacitorGpsFixOptions(profile);
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
		throw new UserFacingError(locationUnsupportedCopy());
	}

	if (isNativeApp()) {
		const position = await Geolocation.getCurrentPosition(toCapacitorFixOptions(profile));
		return fromCapacitorPosition(position);
	}

	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(
			(position) => resolve(fromGeolocationPosition(position)),
			(err) => reject(new UserFacingError(geolocationErrorCopy(err))),
			getGpsFixOptions(profile)
		);
	});
}

export async function startWatching(
	onUpdate: (reading: LocationReading) => void,
	onError: (copy: ErrorCopy) => void,
	profileOrPurpose: GpsProfile | GpsPurpose = 'watch'
): Promise<LocationWatchHandle> {
	const profile = resolveProfile(profileOrPurpose);
	if (!isLocationSupported()) {
		throw new UserFacingError(locationUnsupportedCopy());
	}

	if (isNativeApp()) {
		const id = await Geolocation.watchPosition(toCapacitorWatchOptions(profile), (position, err) => {
			if (err) {
				onError(geolocationErrorCopy(err));
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
		(err) => onError(geolocationErrorCopy(err)),
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
