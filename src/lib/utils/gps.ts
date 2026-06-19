import { POOR_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';

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
