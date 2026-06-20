import type { GeomagnetismModel } from 'geomagnetism';

let wmmModel: GeomagnetismModel | null = null;
let declinationCache: { lat: number; lng: number; decl: number } | null = null;

function roundCoord(value: number): number {
	return Math.round(value * 1000) / 1000;
}

export async function loadMagneticDeclinationDeg(
	latitude: number,
	longitude: number
): Promise<number> {
	const lat = roundCoord(latitude);
	const lng = roundCoord(longitude);

	if (declinationCache?.lat === lat && declinationCache?.lng === lng) {
		return declinationCache.decl;
	}

	if (!wmmModel) {
		const { model } = await import('geomagnetism');
		wmmModel = model();
	}

	const decl = wmmModel.point([lat, lng]).decl;
	declinationCache = { lat, lng, decl };
	return decl;
}

/** Test helper: reset cached declination between tests. */
export function resetMagneticDeclinationCache(): void {
	declinationCache = null;
	wmmModel = null;
}
