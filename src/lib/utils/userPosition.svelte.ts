export interface UserPosition {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
}

export const userPositionState = $state({
	position: null as UserPosition | null,
	watching: false,
	error: '' as string
});

let watchId: number | null = null;

export function startWatchingPosition(): void {
	if (!navigator.geolocation) {
		userPositionState.error = 'Géolocalisation non supportée';
		return;
	}

	stopWatchingPosition();
	userPositionState.watching = true;
	userPositionState.error = '';

	watchId = navigator.geolocation.watchPosition(
		(pos) => {
			userPositionState.position = {
				latitude: pos.coords.latitude,
				longitude: pos.coords.longitude,
				accuracyMeters: pos.coords.accuracy ?? null
			};
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
				const position: UserPosition = {
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					accuracyMeters: pos.coords.accuracy ?? null
				};
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
