/**
 * Ray-casting point-in-polygon for GeoJSON Polygon / MultiPolygon rings (lon/lat).
 * Rings are [lng, lat][]; holes are respected (odd winding count).
 */

type Position = [number, number];

function pointInRing(longitude: number, latitude: number, ring: Position[]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0];
		const yi = ring[i][1];
		const xj = ring[j][0];
		const yj = ring[j][1];
		const intersect =
			yi > latitude !== yj > latitude &&
			longitude < ((xj - xi) * (latitude - yi)) / (yj - yi + Number.EPSILON) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

function pointInPolygonRings(longitude: number, latitude: number, rings: Position[][]): boolean {
	if (rings.length === 0) return false;
	if (!pointInRing(longitude, latitude, rings[0])) return false;
	for (let h = 1; h < rings.length; h += 1) {
		if (pointInRing(longitude, latitude, rings[h])) return false;
	}
	return true;
}

export function pointInGeoJsonGeometry(
	longitude: number,
	latitude: number,
	geometry: { type?: string; coordinates?: unknown } | null | undefined
): boolean {
	if (!geometry?.type || geometry.coordinates == null) return false;

	if (geometry.type === 'Polygon') {
		return pointInPolygonRings(longitude, latitude, geometry.coordinates as Position[][]);
	}

	if (geometry.type === 'MultiPolygon') {
		const polys = geometry.coordinates as Position[][][];
		return polys.some((rings) => pointInPolygonRings(longitude, latitude, rings));
	}

	return false;
}
