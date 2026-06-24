import { getCurrentPosition as readCurrentPosition } from '$lib/utils/locationProvider';

export const POOR_ACCURACY_THRESHOLD_M = 25;
export const GPS_EXCELLENT_ACCURACY_THRESHOLD_M = 10;

/** Fresh fix required for tree / parking capture — longer timeout for cold start (montagne, hors-ligne). */
export const GPS_CAPTURE_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 30_000,
	maximumAge: 0
};

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

/** @deprecated Use GPS_CAPTURE_OPTIONS or GPS_WATCH_OPTIONS */
export const GPS_HIGH_ACCURACY_OPTIONS = GPS_CAPTURE_OPTIONS;

export type GpsProfile = 'capture' | 'navigation' | 'watch' | 'proximity';

/** @deprecated Use GpsProfile */
export type GpsPurpose = 'capture' | 'watch';

const GPS_OPTIONS_BY_PROFILE: Record<GpsProfile, PositionOptions> = {
	capture: GPS_CAPTURE_OPTIONS,
	navigation: GPS_NAVIGATION_OPTIONS,
	watch: {
		enableHighAccuracy: true,
		timeout: 20_000,
		maximumAge: 5_000
	},
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
