import * as m from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime.js';
import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';
import { haversineDistanceM } from '$lib/utils/haversine';

const INTL_LOCALE: Record<string, string> = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	it: 'it-IT',
	es: 'es-ES',
	nl: 'nl-NL',
	sv: 'sv-SE',
	nb: 'nb-NO',
	pt: 'pt-PT',
	da: 'da-DK',
	fi: 'fi-FI'
};

export type GpsSignalQuality = 'excellent' | 'fair' | 'poor' | 'unknown';

const EXCELLENT_ACCURACY_THRESHOLD_M = 10;
const FAIR_ACCURACY_THRESHOLD_M = 30;

export function getGpsSignalQuality(meters: number | null): GpsSignalQuality {
	if (meters === null) {
		return 'unknown';
	}
	if (meters <= EXCELLENT_ACCURACY_THRESHOLD_M) {
		return 'excellent';
	}
	if (meters <= FAIR_ACCURACY_THRESHOLD_M) {
		return 'fair';
	}
	return 'poor';
}

const GPS_QUALITY_RANK: Record<GpsSignalQuality, number> = {
	unknown: 0,
	poor: 1,
	fair: 2,
	excellent: 3
};

/** Haptic only when live accuracy steps up a quality band — never on retreat or every metre. */
export function gpsQualityUpgrade(
	prev: GpsSignalQuality,
	next: GpsSignalQuality
): 'selection' | 'success' | null {
	if (GPS_QUALITY_RANK[next] <= GPS_QUALITY_RANK[prev]) {
		return null;
	}
	if (next === 'excellent') {
		return 'success';
	}
	if (next === 'fair') {
		return 'selection';
	}
	return null;
}

export function formatAccuracy(meters: number | null): string {
	if (meters === null) {
		return m.gps_accuracy_unknown();
	}
	return m.gps_accuracy_format({ meters: String(Math.round(meters)) });
}

export function formatAltitude(meters: number | null): string | null {
	if (meters === null) {
		return null;
	}
	const locale = INTL_LOCALE[getLocale()] ?? 'fr-FR';
	return m.format_distance_m({ n: Math.round(meters).toLocaleString(locale) });
}

export function isPoorAccuracy(meters: number | null): boolean {
	return meters === null || meters > POOR_ACCURACY_THRESHOLD_M;
}

/** Lower accuracy radius (meters) is better; null accuracy never beats a known reading. */
export function isBetterAccuracy(candidate: number | null, currentBest: number | null): boolean {
	if (candidate === null) {
		return false;
	}
	if (currentBest === null) {
		return true;
	}
	return candidate < currentBest;
}

/** Floor so forest GNSS wobble (10–20 m) does not reset best; house→forest is km. */
export const BEST_CAPTURE_JUMP_FLOOR_M = 50;

export type CapturePositionSample = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
};

export function isCaptureBestNearLive(
	best: CapturePositionSample,
	live: CapturePositionSample
): boolean {
	const distanceM = haversineDistanceM(
		best.latitude,
		best.longitude,
		live.latitude,
		live.longitude
	);
	const accBest = best.accuracyMeters ?? 0;
	const accLive = live.accuracyMeters ?? 0;
	const jumpThresholdM = Math.max(BEST_CAPTURE_JUMP_FLOOR_M, 3 * (accBest + accLive));
	return distanceM <= jumpThresholdM;
}

/** Replace session-best when live jumped away (cached house) or is more accurate on-site. */
export function shouldReplaceBestCapturePosition(
	best: CapturePositionSample | null,
	live: CapturePositionSample
): boolean {
	if (!best) {
		return true;
	}
	if (!isCaptureBestNearLive(best, live)) {
		return true;
	}
	return isBetterAccuracy(live.accuracyMeters, best.accuracyMeters);
}

export function hasApproximateGps(
	latitude: number | null,
	longitude: number | null,
	accuracyMeters: number | null
): boolean {
	if (latitude === null || longitude === null) {
		return false;
	}
	return isPoorAccuracy(accuracyMeters);
}
