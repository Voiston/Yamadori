export const POOR_ACCURACY_THRESHOLD_M = 25;

export const GPS_HIGH_ACCURACY_OPTIONS: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 15_000,
	maximumAge: 0
};

export type GpsCapture = {
	latitude: number | null;
	longitude: number | null;
	accuracyMeters: number | null;
	altitudeMeters: number | null;
};

export function getCurrentPosition(): Promise<GeolocationPosition> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Géolocalisation non supportée'));
			return;
		}

		navigator.geolocation.getCurrentPosition(resolve, reject, GPS_HIGH_ACCURACY_OPTIONS);
	});
}

export async function getCoordinates(): Promise<GpsCapture> {
	try {
		const position = await getCurrentPosition();
		const { latitude, longitude, accuracy, altitude } = position.coords;

		return {
			latitude,
			longitude,
			accuracyMeters: accuracy ?? null,
			altitudeMeters: altitude ?? null
		};
	} catch {
		return {
			latitude: null,
			longitude: null,
			accuracyMeters: null,
			altitudeMeters: null
		};
	}
}
