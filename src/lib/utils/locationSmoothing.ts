import type { LocationReading } from '$lib/utils/locationProvider';

const SMOOTHING_THRESHOLD_M = 10;

export function smoothLocationReading(
	previous: LocationReading | null,
	incoming: LocationReading
): LocationReading {
	const accuracy = incoming.accuracyMeters;
	if (accuracy === null || accuracy <= SMOOTHING_THRESHOLD_M || !previous) {
		return incoming;
	}

	const alpha = accuracy > 25 ? 0.3 : 0.5;

	return {
		...incoming,
		latitude: previous.latitude + alpha * (incoming.latitude - previous.latitude),
		longitude: previous.longitude + alpha * (incoming.longitude - previous.longitude)
	};
}
