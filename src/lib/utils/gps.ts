import * as m from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime.js';
import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';

const INTL_LOCALE: Record<string, string> = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	it: 'it-IT',
	es: 'es-ES'
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
	return `${Math.round(meters).toLocaleString(locale)} m`;
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
