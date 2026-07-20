import { getCurrentPosition as readCurrentPosition } from '$lib/utils/locationProvider';

export const REGIONAL_API_COORD_DECIMALS = 2;

/** Tronque les coords avant envoi à Open-Meteo / Nominatim (~1,1 km en latitude). */
export function regionalApiCoordinates(
	latitude: number,
	longitude: number
): { latitude: number; longitude: number } {
	const factor = 10 ** REGIONAL_API_COORD_DECIMALS;
	return {
		latitude: Math.trunc(latitude * factor) / factor,
		longitude: Math.trunc(longitude * factor) / factor
	};
}

export const POOR_ACCURACY_THRESHOLD_M = 25;
export const GPS_EXCELLENT_ACCURACY_THRESHOLD_M = 10;

/** Fresh fix for save — no cached position. */
export const GPS_CAPTURE_FIX_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 30_000,
	maximumAge: 0
};

/** Live capture watch — allow a short OS cache while GNSS refines. */
export const GPS_CAPTURE_WATCH_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 30_000,
	maximumAge: 5_000
};

/** @deprecated Use GPS_CAPTURE_FIX_OPTIONS or GPS_CAPTURE_WATCH_OPTIONS */
export const GPS_CAPTURE_OPTIONS = GPS_CAPTURE_FIX_OPTIONS;

/** Continuous map / compass tracking — allow a short cache to reduce churn. */
export const GPS_WATCH_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 20_000,
	maximumAge: 2_000
};

export const GPS_NAVIGATION_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 20_000,
	maximumAge: 2_000
};

export const GPS_PROXIMITY_OPTIONS: PositionOptions = {
	enableHighAccuracy: false,
	timeout: 20_000,
	maximumAge: 30_000
};

/** @deprecated Use GPS_CAPTURE_FIX_OPTIONS or GPS_CAPTURE_WATCH_OPTIONS */
export const GPS_HIGH_ACCURACY_OPTIONS = GPS_CAPTURE_FIX_OPTIONS;

export type GpsProfile = 'capture' | 'navigation' | 'watch' | 'proximity';

/** @deprecated Use GpsProfile */
export type GpsPurpose = 'capture' | 'watch';

const GPS_OPTIONS_BY_PROFILE: Record<GpsProfile, PositionOptions> = {
	capture: GPS_CAPTURE_WATCH_OPTIONS,
	navigation: GPS_NAVIGATION_OPTIONS,
	watch: {
		enableHighAccuracy: true,
		timeout: 20_000,
		maximumAge: 5_000
	},
	proximity: GPS_PROXIMITY_OPTIONS
};

const GPS_FIX_OPTIONS_BY_PROFILE: Record<GpsProfile, PositionOptions> = {
	capture: GPS_CAPTURE_FIX_OPTIONS,
	navigation: GPS_NAVIGATION_OPTIONS,
	watch: GPS_WATCH_OPTIONS,
	proximity: GPS_PROXIMITY_OPTIONS
};

const CAPACITOR_INTERVALS_BY_PROFILE: Record<
	GpsProfile,
	{ minimumUpdateInterval: number; interval: number }
> = {
	capture: { minimumUpdateInterval: 500, interval: 1_000 },
	navigation: { minimumUpdateInterval: 1_000, interval: 2_000 },
	watch: { minimumUpdateInterval: 2_000, interval: 5_000 },
	proximity: { minimumUpdateInterval: 5_000, interval: 15_000 }
};

export function profileFromPurpose(purpose: GpsPurpose): GpsProfile {
	return purpose;
}

export function getGpsOptions(profile: GpsProfile = 'capture'): PositionOptions {
	return GPS_OPTIONS_BY_PROFILE[profile];
}

export function getGpsFixOptions(profile: GpsProfile = 'capture'): PositionOptions {
	return GPS_FIX_OPTIONS_BY_PROFILE[profile];
}

/** Android-only Capacitor fields — ignored on web/iOS. */
export type CapacitorGpsOptions = PositionOptions & {
	minimumUpdateInterval?: number;
	interval?: number;
	enableLocationFallback?: boolean;
};

export function getCapacitorGpsOptions(profile: GpsProfile = 'capture'): CapacitorGpsOptions {
	const base = getGpsOptions(profile);
	const intervals = CAPACITOR_INTERVALS_BY_PROFILE[profile];

	return {
		...base,
		...intervals,
		enableLocationFallback: true
	};
}

export function getCapacitorGpsFixOptions(profile: GpsProfile = 'capture'): CapacitorGpsOptions {
	const base = getGpsFixOptions(profile);
	const intervals = CAPACITOR_INTERVALS_BY_PROFILE[profile];

	return {
		...base,
		...intervals,
		enableLocationFallback: true
	};
}

export type GpsCapture = {
	latitude: number | null;
	longitude: number | null;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
};

export async function getCoordinates(): Promise<GpsCapture> {
	try {
		const position = await readCurrentPosition('capture');
		return {
			latitude: position.latitude,
			longitude: position.longitude,
			accuracyMeters: position.accuracyMeters,
			altitudeMeters: position.altitudeMeters
		};
	} catch {
		return {
			latitude: null,
			longitude: null,
			accuracyMeters: null,
			altitudeMeters: null
		};
	}
}
