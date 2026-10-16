import { polygonBounds, pointInPolygon, type LngLat } from '$lib/utils/map/downloadRegion';
import { haversineDistanceM } from '$lib/utils/haversine';

/** Same radius as a cached Open-Meteo forecast in `weatherCache`. */
export const FORECAST_COVER_RADIUS_M = 30_000;

/** Grid step so every part of a wide trace falls inside the 30 km cache radius. */
export const FORECAST_GRID_STEP_M = 25_000;

const METERS_PER_DEG_LAT = 111_320;
const DEDUPE_DISTANCE_M = 2_000;

export type ForecastPoint = {
	latitude: number;
	longitude: number;
};

export function polygonCentroid(ring: LngLat[]): ForecastPoint {
	let latitude = 0;
	let longitude = 0;
	for (const [lng, lat] of ring) {
		longitude += lng;
		latitude += lat;
	}
	const count = ring.length || 1;
	return { latitude: latitude / count, longitude: longitude / count };
}

function covers(origin: ForecastPoint, target: ForecastPoint): boolean {
	return (
		haversineDistanceM(origin.latitude, origin.longitude, target.latitude, target.longitude) <=
		FORECAST_COVER_RADIUS_M
	);
}

function isNear(left: ForecastPoint, right: ForecastPoint): boolean {
	return (
		haversineDistanceM(left.latitude, left.longitude, right.latitude, right.longitude) <=
		DEDUPE_DISTANCE_M
	);
}

/**
 * One forecast at the centroid when the whole trace sits inside 30 km.
 * Wider zones add points on a ~25 km grid, plus any vertex still outside that radius.
 */
export function forecastPointsForRing(ring: LngLat[]): ForecastPoint[] {
	if (ring.length === 0) {
		return [];
	}

	const centroid = polygonCentroid(ring);
	const vertices = ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
	if (vertices.every((vertex) => covers(centroid, vertex))) {
		return [centroid];
	}

	const bounds = polygonBounds(ring);
	const midLat = (bounds.south + bounds.north) / 2;
	const latStep = FORECAST_GRID_STEP_M / METERS_PER_DEG_LAT;
	const cos = Math.cos((midLat * Math.PI) / 180);
	const lonStep = FORECAST_GRID_STEP_M / (METERS_PER_DEG_LAT * Math.max(0.2, Math.abs(cos)));
	const points: ForecastPoint[] = [centroid];

	for (let lat = bounds.south + latStep / 2; lat <= bounds.north + 1e-9; lat += latStep) {
		for (let lng = bounds.west + lonStep / 2; lng <= bounds.east + 1e-9; lng += lonStep) {
			if (!pointInPolygon([lng, lat], ring)) {
				continue;
			}
			const point = { latitude: lat, longitude: lng };
			if (points.some((existing) => isNear(existing, point))) {
				continue;
			}
			points.push(point);
		}
	}

	for (const vertex of vertices) {
		if (points.some((existing) => covers(existing, vertex))) {
			continue;
		}
		points.push(vertex);
	}

	return points;
}
