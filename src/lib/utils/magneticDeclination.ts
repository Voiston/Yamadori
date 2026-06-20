import geomagnetism from 'geomagnetism';

const wmmModel = geomagnetism.model();

let declinationCache: { lat: number; lng: number; decl: number } | null = null;

function roundCoord(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export function getMagneticDeclinationDeg(latitude: number, longitude: number): number {
	const lat = roundCoord(latitude);
	const lng = roundCoord(longitude);

	if (declinationCache?.lat === lat && declinationCache?.lng === lng) {
		return declinationCache.decl;
	}

	const decl = wmmModel.point([lat, lng]).decl;
	declinationCache = { lat, lng, decl };
	return decl;
}

/** Test helper: reset cached declination between tests. */
export function resetMagneticDeclinationCache(): void {
	declinationCache = null;
}
