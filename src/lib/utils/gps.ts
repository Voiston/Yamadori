import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';

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
		return 'Précision inconnue';
	}
	return `±${Math.round(meters)} m`;
}

export function formatAltitude(meters: number | null): string | null {
	if (meters === null) {
		return null;
	}
	return `${Math.round(meters).toLocaleString('fr-FR')} m`;
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
	return candidate <= currentBest;
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
