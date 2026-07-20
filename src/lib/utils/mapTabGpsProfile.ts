import type { GpsProfile } from '$lib/utils/geo';
import type { ParkingPosition } from '$lib/types/parking';
import { haversineDistanceM } from '$lib/utils/haversine';

/** Distance below which the map uses a lighter GPS profile near saved parking. */
export const MAP_NEAR_PARKING_M = 220;

export type MapTabGpsContext = {
	embedded: boolean;
	headingLock: boolean;
	parking: ParkingPosition | null;
	userLatitude: number | null;
	userLongitude: number | null;
};

export type MapParkingProximity = 'unknown' | 'near' | 'far';

export function resolveMapParkingProximity(
	parking: ParkingPosition | null,
	userLatitude: number | null,
	userLongitude: number | null
): MapParkingProximity {
	if (!parking || userLatitude === null || userLongitude === null) {
		return 'unknown';
	}

	const distanceM = haversineDistanceM(
		parking.latitude,
		parking.longitude,
		userLatitude,
		userLongitude
	);

	return distanceM >= MAP_NEAR_PARKING_M ? 'far' : 'near';
}

/** GPS profile from parking proximity bucket — stable while user stays in the same zone. */
export function resolveMapTabGpsProfileFromProximity(context: {
	embedded: boolean;
	headingLock: boolean;
	parking: ParkingPosition | null;
	proximity: MapParkingProximity;
}): GpsProfile {
	if (context.embedded && context.headingLock) {
		return 'navigation';
	}

	if (context.parking) {
		if (context.proximity === 'far') {
			return 'watch';
		}
		return 'proximity';
	}

	return 'watch';
}

/** GPS profile for the map tab — lighter proximity tracking near a saved parking spot. */
export function resolveMapTabGpsProfile(context: MapTabGpsContext): GpsProfile {
	return resolveMapTabGpsProfileFromProximity({
		embedded: context.embedded,
		headingLock: context.headingLock,
		parking: context.parking,
		proximity: resolveMapParkingProximity(
			context.parking,
			context.userLatitude,
			context.userLongitude
		)
	});
}
