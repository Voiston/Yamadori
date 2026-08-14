import { haversineDistanceM } from '$lib/utils/haversine';

export const CAPTURE_CLIMATE_REFETCH_DISTANCE_M = 10;
export const CAPTURE_LOCATION_REFETCH_DISTANCE_M = 10;
export const CAPTURE_AGRI_REFETCH_DISTANCE_M = 10;
export const CAPTURE_ENRICHMENT_DEBOUNCE_MS = 2000;

export function capturePositionKey(latitude: number, longitude: number): string {
	return `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
}

export function shouldRefetchCapturePosition(
	anchor: { latitude: number; longitude: number } | null,
	position: { latitude: number; longitude: number },
	thresholdM: number
): boolean {
	if (!anchor) {
		return true;
	}

	return (
		haversineDistanceM(
			anchor.latitude,
			anchor.longitude,
			position.latitude,
			position.longitude
		) >= thresholdM
	);
}
