type LngLat = [number, number];

type PolygonGeometry = {
	type: 'Polygon';
	coordinates: LngLat[][];
};

type GeoFeature<G = PolygonGeometry> = {
	type: 'Feature';
	properties: Record<string, unknown>;
	geometry: G;
};

type GeoFeatureCollection = {
	type: 'FeatureCollection';
	features: GeoFeature[];
};

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

export function createCirclePolygon(
	lng: number,
	lat: number,
	radiusM: number,
	points = 64
): PolygonGeometry {
	const coordinates: LngLat[] = [];
	const latRad = toRadians(lat);
	const lngRad = toRadians(lng);
	const angularDistance = radiusM / EARTH_RADIUS_M;

	for (let i = 0; i <= points; i++) {
		const bearing = toRadians((i / points) * 360);
		const latPoint = Math.asin(
			Math.sin(latRad) * Math.cos(angularDistance) +
				Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
		);
		const lngPoint =
			lngRad +
			Math.atan2(
				Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
				Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(latPoint)
			);
		coordinates.push([toDegrees(lngPoint), toDegrees(latPoint)]);
	}

	return { type: 'Polygon', coordinates: [coordinates] };
}

export function emptyFeatureCollection(): GeoFeatureCollection {
	return { type: 'FeatureCollection', features: [] };
}

export function createApproachLine(
	userLng: number,
	userLat: number,
	treeLng: number,
	treeLat: number
): GeoFeature<{ type: 'LineString'; coordinates: LngLat[] }> {
	return {
		type: 'Feature',
		properties: {},
		geometry: {
			type: 'LineString',
			coordinates: [
				[userLng, userLat],
				[treeLng, treeLat]
			]
		}
	};
}

export function createAccuracyCircleFeature(
	lng: number,
	lat: number,
	radiusM: number,
	color: string
): GeoFeature {
	return {
		type: 'Feature',
		properties: { color },
		geometry: createCirclePolygon(lng, lat, radiusM)
	};
}
