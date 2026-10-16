export type LngLat = [lng: number, lat: number];
export type ScreenPoint = { x: number; y: number };

export const MIN_PATH_LENGTH_PX = 48;
export const LASSO_CLOSE_PX = 56;
export const CORRIDOR_RADIUS_PX = 40;
export const CORRIDOR_STROKE_PX = CORRIDOR_RADIUS_PX * 2;
export const START_TARGET_RADIUS_PX = 10;
export const SIMPLIFY_EPSILON_PX = 3;
export const SAMPLE_MIN_DISTANCE_PX = 3;

const WEB_MERCATOR_MAX_LAT = 85.05112878;

export function distancePx(a: ScreenPoint, b: ScreenPoint): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

export function pathLengthPx(points: ScreenPoint[]): number {
	let length = 0;
	for (let i = 1; i < points.length; i += 1) {
		length += distancePx(points[i - 1], points[i]);
	}
	return length;
}

function perpendicularDistance(point: ScreenPoint, start: ScreenPoint, end: ScreenPoint): number {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const len2 = dx * dx + dy * dy;
	if (len2 === 0) {
		return distancePx(point, start);
	}
	const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / len2));
	return distancePx(point, { x: start.x + t * dx, y: start.y + t * dy });
}

export function simplifyPath(
	points: ScreenPoint[],
	epsilon = SIMPLIFY_EPSILON_PX
): ScreenPoint[] {
	if (points.length <= 2) {
		return points.slice();
	}

	let maxDist = 0;
	let index = 0;
	const start = points[0];
	const end = points[points.length - 1];
	for (let i = 1; i < points.length - 1; i += 1) {
		const dist = perpendicularDistance(points[i], start, end);
		if (dist > maxDist) {
			maxDist = dist;
			index = i;
		}
	}

	if (maxDist > epsilon) {
		const left = simplifyPath(points.slice(0, index + 1), epsilon);
		const right = simplifyPath(points.slice(index), epsilon);
		return [...left.slice(0, -1), ...right];
	}

	return [start, end];
}

export function shoelaceAreaPx(points: ScreenPoint[]): number {
	if (points.length < 3) {
		return 0;
	}
	let area = 0;
	for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
		area += points[j].x * points[i].y - points[i].x * points[j].y;
	}
	return area / 2;
}

export function closeRingPx(points: ScreenPoint[]): ScreenPoint[] {
	if (points.length === 0) {
		return points;
	}
	const first = points[0];
	const last = points[points.length - 1];
	if (first.x === last.x && first.y === last.y) {
		return points.slice();
	}
	return [...points, { x: first.x, y: first.y }];
}

export function isClosedLasso(points: ScreenPoint[]): boolean {
	if (points.length < 4) {
		return false;
	}
	const length = pathLengthPx(points);
	if (length < MIN_PATH_LENGTH_PX) {
		return false;
	}
	const closeDist = distancePx(points[0], points[points.length - 1]);
	if (closeDist <= LASSO_CLOSE_PX) {
		return true;
	}
	return Math.abs(shoelaceAreaPx(points)) >= 64 * 64;
}

/** True when the stroke is long enough and the last point is within snap distance of the start. */
export function isNearLassoClose(points: ScreenPoint[]): boolean {
	if (points.length < 4) {
		return false;
	}
	if (pathLengthPx(points) < MIN_PATH_LENGTH_PX) {
		return false;
	}
	return distancePx(points[0], points[points.length - 1]) <= LASSO_CLOSE_PX;
}

export function snapLassoClose(points: ScreenPoint[]): ScreenPoint[] {
	if (points.length === 0 || !isNearLassoClose(points)) {
		return points.slice();
	}
	const start = points[0];
	const last = points[points.length - 1];
	if (last.x === start.x && last.y === start.y) {
		return points.slice();
	}
	return [...points.slice(0, -1), { x: start.x, y: start.y }];
}

function unitNormal(points: ScreenPoint[], index: number): ScreenPoint {
	const prev = points[Math.max(0, index - 1)];
	const next = points[Math.min(points.length - 1, index + 1)];
	const dx = next.x - prev.x;
	const dy = next.y - prev.y;
	const len = Math.hypot(dx, dy);
	if (len === 0) {
		return { x: 0, y: 1 };
	}
	return { x: -dy / len, y: dx / len };
}

function circlePointsPx(center: ScreenPoint, radiusPx: number, count = 16): ScreenPoint[] {
	const ring: ScreenPoint[] = [];
	for (let i = 0; i <= count; i += 1) {
		const angle = (i / count) * Math.PI * 2;
		ring.push({
			x: center.x + Math.cos(angle) * radiusPx,
			y: center.y + Math.sin(angle) * radiusPx
		});
	}
	return ring;
}

export function bufferPolylinePx(
	points: ScreenPoint[],
	radiusPx = CORRIDOR_RADIUS_PX
): ScreenPoint[] {
	if (points.length === 0) {
		return [];
	}
	if (points.length === 1 || pathLengthPx(points) < 1) {
		return circlePointsPx(points[0], radiusPx);
	}

	const left: ScreenPoint[] = [];
	const right: ScreenPoint[] = [];
	for (let i = 0; i < points.length; i += 1) {
		const normal = unitNormal(points, i);
		const point = points[i];
		left.push({
			x: point.x + normal.x * radiusPx,
			y: point.y + normal.y * radiusPx
		});
		right.push({
			x: point.x - normal.x * radiusPx,
			y: point.y - normal.y * radiusPx
		});
	}

	return closeRingPx([...left, ...right.reverse()]);
}

export function buildScreenDownloadRing(points: ScreenPoint[]): ScreenPoint[] | null {
	const simplified = simplifyPath(points);
	if (simplified.length === 0) {
		return null;
	}

	const length = pathLengthPx(simplified);
	const area = Math.abs(shoelaceAreaPx(simplified));
	if (simplified.length < 2 && length < MIN_PATH_LENGTH_PX) {
		return null;
	}
	if (length < MIN_PATH_LENGTH_PX && area < 48 * 48) {
		return null;
	}

	if (isClosedLasso(simplified)) {
		return closeRingPx(simplified);
	}

	return bufferPolylinePx(simplified);
}

export function screenRingToLngLats(
	ring: ScreenPoint[],
	unproject: (point: [number, number]) => { lng: number; lat: number }
): LngLat[] {
	return ring.map((point) => {
		const lngLat = unproject([point.x, point.y]);
		return [lngLat.lng, lngLat.lat];
	});
}

export function svgPathFromPoints(points: ScreenPoint[], closed: boolean): string {
	if (points.length === 0) {
		return '';
	}
	const body = points
		.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
		.join(' ');
	return closed ? `${body} Z` : body;
}

/** Even-odd path: full viewport minus the download ring (hole). */
export function svgEvenOddMaskPath(
	ring: ScreenPoint[],
	width: number,
	height: number
): string {
	if (ring.length === 0 || width <= 0 || height <= 0) {
		return '';
	}
	const outer = `M0 0H${width}V${height}H0Z`;
	return `${outer} ${svgPathFromPoints(ring, true)}`;
}

export function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
	const clampedLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
	const latRad = (clampedLat * Math.PI) / 180;
	const n = 2 ** zoom;
	const x = Math.floor(((lng + 180) / 360) * n);
	const y = Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
	);
	return { x, y };
}

export function tileToBBox(
	z: number,
	x: number,
	y: number
): { west: number; south: number; east: number; north: number } {
	const n = 2 ** z;
	const west = (x / n) * 360 - 180;
	const east = ((x + 1) / n) * 360 - 180;
	const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
	const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
	return { west, south, east, north };
}

export function polygonBounds(ring: LngLat[]): {
	west: number;
	south: number;
	east: number;
	north: number;
} {
	let west = 180;
	let east = -180;
	let south = 90;
	let north = -90;
	for (const [lng, lat] of ring) {
		west = Math.min(west, lng);
		east = Math.max(east, lng);
		south = Math.min(south, lat);
		north = Math.max(north, lat);
	}
	return { west, south, east, north };
}

export function pointInPolygon(point: LngLat, ring: LngLat[]): boolean {
	const x = point[0];
	const y = point[1];
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
		const xi = ring[i][0];
		const yi = ring[i][1];
		const xj = ring[j][0];
		const yj = ring[j][1];
		const intersects =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
		if (intersects) {
			inside = !inside;
		}
	}
	return inside;
}

function pointInBBox(
	point: LngLat,
	bbox: { west: number; south: number; east: number; north: number }
): boolean {
	return (
		point[0] >= bbox.west &&
		point[0] <= bbox.east &&
		point[1] >= bbox.south &&
		point[1] <= bbox.north
	);
}

function orientation(p: LngLat, q: LngLat, r: LngLat): number {
	const value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
	if (Math.abs(value) < 1e-18) {
		return 0;
	}
	return value > 0 ? 1 : 2;
}

function onSegment(p: LngLat, q: LngLat, r: LngLat): boolean {
	return (
		Math.min(p[0], r[0]) <= q[0] &&
		q[0] <= Math.max(p[0], r[0]) &&
		Math.min(p[1], r[1]) <= q[1] &&
		q[1] <= Math.max(p[1], r[1])
	);
}

function segmentsIntersect(p1: LngLat, q1: LngLat, p2: LngLat, q2: LngLat): boolean {
	const o1 = orientation(p1, q1, p2);
	const o2 = orientation(p1, q1, q2);
	const o3 = orientation(p2, q2, p1);
	const o4 = orientation(p2, q2, q1);
	if (o1 !== o2 && o3 !== o4) {
		return true;
	}
	if (o1 === 0 && onSegment(p1, p2, q1)) return true;
	if (o2 === 0 && onSegment(p1, q2, q1)) return true;
	if (o3 === 0 && onSegment(p2, p1, q2)) return true;
	if (o4 === 0 && onSegment(p2, q1, q2)) return true;
	return false;
}

export function tileIntersectsPolygon(z: number, x: number, y: number, ring: LngLat[]): boolean {
	if (ring.length < 3) {
		return false;
	}

	const bbox = tileToBBox(z, x, y);
	const corners: LngLat[] = [
		[bbox.west, bbox.north],
		[bbox.east, bbox.north],
		[bbox.east, bbox.south],
		[bbox.west, bbox.south]
	];
	const center: LngLat = [(bbox.west + bbox.east) / 2, (bbox.south + bbox.north) / 2];

	if (pointInPolygon(center, ring)) {
		return true;
	}
	for (const corner of corners) {
		if (pointInPolygon(corner, ring)) {
			return true;
		}
	}
	for (const vertex of ring) {
		if (pointInBBox(vertex, bbox)) {
			return true;
		}
	}

	const tileEdges: Array<[LngLat, LngLat]> = [
		[corners[0], corners[1]],
		[corners[1], corners[2]],
		[corners[2], corners[3]],
		[corners[3], corners[0]]
	];
	for (let i = 0; i < ring.length; i += 1) {
		const a = ring[i];
		const b = ring[(i + 1) % ring.length];
		for (const [c, d] of tileEdges) {
			if (segmentsIntersect(a, b, c, d)) {
				return true;
			}
		}
	}

	return false;
}

export function listTilesForPolygon(
	ring: LngLat[],
	zoomLevels: number[]
): Array<{ z: number; x: number; y: number }> {
	if (ring.length < 3) {
		return [];
	}

	const bounds = polygonBounds(ring);
	const tiles: Array<{ z: number; x: number; y: number }> = [];

	for (const zoom of zoomLevels) {
		const n = 2 ** zoom;
		const min = lngLatToTile(bounds.west, bounds.north, zoom);
		const max = lngLatToTile(bounds.east, bounds.south, zoom);
		const minX = Math.max(0, Math.min(min.x, max.x) - 1);
		const maxX = Math.min(n - 1, Math.max(min.x, max.x) + 1);
		const minY = Math.max(0, Math.min(min.y, max.y) - 1);
		const maxY = Math.min(n - 1, Math.max(min.y, max.y) + 1);

		for (let x = minX; x <= maxX; x += 1) {
			for (let y = minY; y <= maxY; y += 1) {
				if (tileIntersectsPolygon(zoom, x, y, ring)) {
					tiles.push({ z: zoom, x, y });
				}
			}
		}
	}

	return tiles;
}

export function countTilesForPolygon(ring: LngLat[], zoomLevels: number[]): number {
	return listTilesForPolygon(ring, zoomLevels).length;
}

export function createIncludeTileForPolygon(
	ring: LngLat[]
): (z: number, x: number, y: number) => boolean {
	return (z, x, y) => tileIntersectsPolygon(z, x, y, ring);
}
