import { haversineDistanceM } from '$lib/utils/haversine';

export const COMPASS_POSITION_EPSILON_M = 3;

export type CompassPosition = {
	latitude: number;
	longitude: number;
};

export function shouldUpdateCompassPosition(
	anchor: CompassPosition | null,
	next: CompassPosition,
	epsilonM = COMPASS_POSITION_EPSILON_M
): boolean {
	if (!anchor) {
		return true;
	}

	return (
		haversineDistanceM(anchor.latitude, anchor.longitude, next.latitude, next.longitude) >=
		epsilonM
	);
}
