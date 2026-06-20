import { haversineBearingDeg, haversineDistanceM, normalizeHeading360 } from '$lib/utils/haversine';

export interface UserPosition {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
	courseDegrees: number | null;
	speedMps: number | null;
}

export const userPositionState = $state({
	position: null as UserPosition | null,
	watching: false,
	error: '' as string
});

let watchId: number | null = null;
let lastWatchCoords: { latitude: number; longitude: number } | null = null;

const MIN_DERIVED_COURSE_SPEED_MPS = 0.8;
const MIN_DERIVED_COURSE_DISTANCE_M = 1;

function resolveCourseDegrees(
	pos: GeolocationPosition,
	previous: { latitude: number; longitude: number } | null
): number | null {
	const heading = pos.coords.heading;
	if (heading !== null && !Number.isNaN(heading) && heading >= 0) {
		return normalizeHeading360(heading);
	}

	const speed = pos.coords.speed;
	if (
		previous &&
		speed !== null &&
		!Number.isNaN(speed) &&
		speed >= MIN_DERIVED_COURSE_SPEED_MPS
	) {
		const movedMeters = haversineDistanceM(
			previous.latitude,
			previous.longitude,
			pos.coords.latitude,
			pos.coords.longitude
		);
		if (movedMeters >= MIN_DERIVED_COURSE_DISTANCE_M) {
			return haversineBearingDeg(
				previous.latitude,
				previous.longitude,
				pos.coords.latitude,
				pos.coords.longitude
			);
		}
	}

	return null;
}

function resolveSpeedMps(pos: GeolocationPosition): number | null {
	const speed = pos.coords.speed;
	if (speed === null || Number.isNaN(speed) || speed < 0) {
		return null;
	}
	return speed;
}

function toUserPosition(pos: GeolocationPosition): UserPosition {
	const courseDegrees = resolveCourseDegrees(pos, lastWatchCoords);
	const speedMps = resolveSpeedMps(pos);

	lastWatchCoords = {
		latitude: pos.coords.latitude,
		longitude: pos.coords.longitude
	};

	return {
		latitude: pos.coords.latitude,
		longitude: pos.coords.longitude,
		accuracyMeters: pos.coords.accuracy ?? null,
		courseDegrees,
		speedMps
	};
}

export function startWatchingPosition(): void {
	if (!navigator.geolocation) {
		userPositionState.error = 'Géolocalisation non supportée';
		return;
	}

	stopWatchingPosition();
	userPositionState.watching = true;
	userPositionState.error = '';
	lastWatchCoords = null;

	watchId = navigator.geolocation.watchPosition(
		(pos) => {
			userPositionState.position = toUserPosition(pos);
		},
		(err) => {
			userPositionState.error = err.message || 'Position indisponible';
		},
		{
			enableHighAccuracy: true,
			maximumAge: 5_000,
			timeout: 15_000
		}
	);
}

export function stopWatchingPosition(): void {
	if (watchId !== null) {
		navigator.geolocation.clearWatch(watchId);
		watchId = null;
	}
	lastWatchCoords = null;
	userPositionState.watching = false;
}

export async function requestCurrentPosition(): Promise<UserPosition | null> {
	if (!navigator.geolocation) {
		userPositionState.error = 'Géolocalisation non supportée';
		return null;
	}

	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const position = toUserPosition(pos);
				userPositionState.position = position;
				userPositionState.error = '';
				resolve(position);
			},
			(err) => {
				userPositionState.error = err.message || 'Position indisponible';
				resolve(null);
			},
			{
				enableHighAccuracy: true,
				timeout: 10_000,
				maximumAge: 0
			}
		);
	});
}
