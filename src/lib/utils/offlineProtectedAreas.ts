import { createStore } from 'idb-keyval';
import type { LngLat } from '$lib/utils/map/downloadRegion';
import { pointInPolygon } from '$lib/utils/map/downloadRegion';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import {
	encryptedCacheGet,
	encryptedCacheSet,
	registerGeoCacheStore
} from '$lib/utils/encryptedCacheStore';
import { offlineParcelPolygonsAt, simplifyRing } from '$lib/utils/offlineParcels';
import type { ProtectedZonePresence } from '$lib/types/harvest-ethics';

const APICARTO_NATURE_URL = 'https://apicarto.ign.fr/api/nature';
const PAGE_LIMIT = 500;
const FETCH_TIMEOUT_MS = 20_000;
/** Entités gardées pour une zone. Au-delà, le tracé reste incomplet. */
export const OFFLINE_PROTECTED_LIMIT = 2_000;
const STORED_RING_POINTS = 2_000;
const REQUEST_RING_POINTS = 160;
const INDEX_KEY = 'index';

const STORE_ID = 'offline-protected';
const protectedStore = createStore('yamadori-offline-protected', 'features');
registerGeoCacheStore(protectedStore, STORE_ID);

type BBox = { west: number; south: number; east: number; north: number };

/** Couches lues par le scan France, dans le même ordre que `NATURE_LAYERS`. */
const NATURE_LAYERS = [
	{ id: 'pn', cardId: 'pn', level: 'veto' },
	{ id: 'rnn', cardId: 'rnn', level: 'veto' },
	{ id: 'pnr', cardId: 'pnr', level: 'caution' },
	{ id: 'rnc', cardId: 'rnr_regional', level: 'caution' },
	{ id: 'rncf', cardId: 'rnr_regional', level: 'caution' },
	{ id: 'natura-habitat', cardId: 'natura2000', level: 'caution' },
	{ id: 'natura-oiseaux', cardId: 'natura2000', level: 'caution' },
	{ id: 'znieff1', cardId: 'znieff', level: 'caution' },
	{ id: 'znieff2', cardId: 'znieff', level: 'caution' }
] as const;

export type OfflineProtectedCardId = (typeof NATURE_LAYERS)[number]['cardId'];

export type StoredProtectedFeature = {
	id: string;
	layerId: string;
	cardId: OfflineProtectedCardId;
	bbox: BBox;
	polygons: LngLat[][][];
};

export type StoredProtectedCoverage = {
	id: string;
	ring: LngLat[];
	complete: boolean;
	bbox: BBox;
};

export type OfflineProtectedIndex = {
	features: StoredProtectedFeature[];
	coverages: StoredProtectedCoverage[];
};

export type OfflineProtectedPresence = Record<OfflineProtectedCardId, ProtectedZonePresence>;

export type OfflineProtectedResolution =
	| { kind: 'miss' }
	| { kind: 'ready'; partial: boolean; presence: OfflineProtectedPresence };

export type OfflineProtectedPrefetchResult = {
	saved: number;
	capped: boolean;
	incomplete: boolean;
};

type GeoJsonFeature = {
	geometry?: { type?: string; coordinates?: unknown };
};

type GeoJsonFeatureCollection = {
	features?: GeoJsonFeature[];
};

const EMPTY_PRESENCE = (): OfflineProtectedPresence => ({
	pn: 'clear',
	rnn: 'clear',
	pnr: 'clear',
	rnr_regional: 'clear',
	natura2000: 'clear',
	znieff: 'clear'
});

const EMPTY_INDEX: OfflineProtectedIndex = { features: [], coverages: [] };

let memoryIndex: OfflineProtectedIndex | null = null;

function isClosed(ring: LngLat[]): boolean {
	if (ring.length < 2) return false;
	const first = ring[0];
	const last = ring[ring.length - 1];
	return first[0] === last[0] && first[1] === last[1];
}

function closeRing(ring: LngLat[]): LngLat[] {
	if (ring.length < 3) return ring;
	if (isClosed(ring)) return ring;
	return [...ring, ring[0]];
}

function parseRing(value: unknown): LngLat[] {
	if (!Array.isArray(value)) return [];
	const ring: LngLat[] = [];
	for (const position of value) {
		if (!Array.isArray(position) || position.length < 2) continue;
		const lng = position[0];
		const lat = position[1];
		if (typeof lng !== 'number' || typeof lat !== 'number') continue;
		ring.push([lng, lat]);
	}
	return ring.length >= 3 ? simplifyRing(ring, STORED_RING_POINTS) : [];
}

function parsePolygons(geometry: GeoJsonFeature['geometry']): LngLat[][][] {
	if (!geometry?.type || !Array.isArray(geometry.coordinates)) return [];
	if (geometry.type === 'Polygon') {
		const rings = geometry.coordinates.map(parseRing).filter((ring) => ring.length >= 3);
		return rings.length > 0 ? [rings] : [];
	}
	if (geometry.type === 'MultiPolygon') {
		const polygons: LngLat[][][] = [];
		for (const polygon of geometry.coordinates) {
			if (!Array.isArray(polygon)) continue;
			const rings = polygon.map(parseRing).filter((ring) => ring.length >= 3);
			if (rings.length > 0) polygons.push(rings);
		}
		return polygons;
	}
	return [];
}

function bboxFor(polygons: LngLat[][][]): BBox | null {
	let west = Infinity;
	let south = Infinity;
	let east = -Infinity;
	let north = -Infinity;
	for (const polygon of polygons) {
		for (const ring of polygon) {
			for (const [lng, lat] of ring) {
				west = Math.min(west, lng);
				south = Math.min(south, lat);
				east = Math.max(east, lng);
				north = Math.max(north, lat);
			}
		}
	}
	if (!Number.isFinite(west)) return null;
	return { west, south, east, north };
}

function bboxContains(bbox: BBox, longitude: number, latitude: number): boolean {
	return (
		longitude >= bbox.west &&
		longitude <= bbox.east &&
		latitude >= bbox.south &&
		latitude <= bbox.north
	);
}

function bboxOverlaps(left: BBox, right: BBox): boolean {
	return (
		left.west <= right.east &&
		left.east >= right.west &&
		left.south <= right.north &&
		left.north >= right.south
	);
}

function polygonContains(polygon: LngLat[][], point: LngLat): boolean {
	const [outer, ...holes] = polygon;
	if (!outer || outer.length < 3 || !pointInPolygon(point, outer)) return false;
	return !holes.some((hole) => hole.length >= 3 && pointInPolygon(point, hole));
}

function geometryContains(bbox: BBox, polygons: LngLat[][][], longitude: number, latitude: number): boolean {
	if (!bboxContains(bbox, longitude, latitude)) return false;
	const point: LngLat = [longitude, latitude];
	return polygons.some((polygon) => polygonContains(polygon, point));
}

function orientation(p: LngLat, q: LngLat, r: LngLat): number {
	const value = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
	if (Math.abs(value) < 1e-18) return 0;
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
	if (o1 !== o2 && o3 !== o4) return true;
	if (o1 === 0 && onSegment(p1, p2, q1)) return true;
	if (o2 === 0 && onSegment(p1, q2, q1)) return true;
	if (o3 === 0 && onSegment(p2, p1, q2)) return true;
	if (o4 === 0 && onSegment(p2, q1, q2)) return true;
	return false;
}

function vertexInside(polygons: LngLat[][][], other: LngLat[][][]): boolean {
	for (const polygon of polygons) {
		for (const ring of polygon) {
			for (const point of ring) {
				if (other.some((candidate) => polygonContains(candidate, point))) return true;
			}
		}
	}
	return false;
}

function edgesCross(left: LngLat[][][], right: LngLat[][][]): boolean {
	const leftRings = left.flat();
	const rightRings = right.flat();
	for (const ringA of leftRings) {
		for (let i = 0; i < ringA.length - 1; i += 1) {
			for (const ringB of rightRings) {
				for (let j = 0; j < ringB.length - 1; j += 1) {
					if (segmentsIntersect(ringA[i], ringA[i + 1], ringB[j], ringB[j + 1])) return true;
				}
			}
		}
	}
	return false;
}

function polygonsIntersect(left: LngLat[][][], right: LngLat[][][]): boolean {
	return vertexInside(left, right) || vertexInside(right, left) || edgesCross(left, right);
}

function polygonJson(ring: LngLat[]): string {
	const closed = closeRing(simplifyRing(ring, REQUEST_RING_POINTS));
	return JSON.stringify({ type: 'Polygon', coordinates: [closed] });
}

function featureFromGeometry(
	layer: (typeof NATURE_LAYERS)[number],
	geometry: GeoJsonFeature['geometry'],
	ordinal: number
): StoredProtectedFeature | null {
	const polygons = parsePolygons(geometry);
	const bbox = bboxFor(polygons);
	if (!bbox) return null;
	return {
		id: `${layer.id}|${bbox.west.toFixed(5)}|${bbox.south.toFixed(5)}|${bbox.east.toFixed(5)}|${bbox.north.toFixed(5)}|${ordinal}`,
		layerId: layer.id,
		cardId: layer.cardId,
		bbox,
		polygons
	};
}

async function loadIndex(): Promise<OfflineProtectedIndex> {
	if (memoryIndex) return memoryIndex;
	const stored = await encryptedCacheGet<OfflineProtectedIndex>(protectedStore, STORE_ID, INDEX_KEY);
	memoryIndex = stored ?? { features: [], coverages: [] };
	return memoryIndex;
}

async function saveIndex(index: OfflineProtectedIndex): Promise<void> {
	memoryIndex = index;
	await encryptedCacheSet(protectedStore, STORE_ID, INDEX_KEY, index);
}

export async function clearOfflineProtectedIndex(): Promise<void> {
	memoryIndex = null;
	await saveIndex(EMPTY_INDEX);
	memoryIndex = null;
}

/**
 * Point dans un polygone enregistré → carte certaine.
 * Point dans un tracé complet, sans polygone → cartes claires, ou potentielles si la parcelle croise.
 * Hors d’un tracé complet, sans détection certaine → on ne conclut pas.
 */
export function resolveProtectedIndex(
	index: OfflineProtectedIndex,
	parcelPolygons: LngLat[][][] | null,
	latitude: number,
	longitude: number
): OfflineProtectedResolution {
	const presence = EMPTY_PRESENCE();
	let certain = false;

	for (const feature of index.features) {
		if (geometryContains(feature.bbox, feature.polygons, longitude, latitude)) {
			presence[feature.cardId] = 'certain';
			certain = true;
			continue;
		}
		if (presence[feature.cardId] === 'certain' || !parcelPolygons) continue;
		if (!bboxOverlaps(feature.bbox, bboxFor(parcelPolygons) ?? feature.bbox)) continue;
		if (polygonsIntersect(parcelPolygons, feature.polygons)) {
			presence[feature.cardId] = 'potential';
		}
	}

	const inComplete = index.coverages.some(
		(coverage) =>
			coverage.complete &&
			bboxContains(coverage.bbox, longitude, latitude) &&
			pointInPolygon([longitude, latitude], coverage.ring)
	);

	if (!inComplete) {
		if (!certain) return { kind: 'miss' };
		for (const cardId of Object.keys(presence) as OfflineProtectedCardId[]) {
			if (presence[cardId] === 'potential') presence[cardId] = 'clear';
		}
		return { kind: 'ready', partial: true, presence };
	}

	return { kind: 'ready', partial: false, presence };
}

export async function resolveOfflineProtectedArea(
	latitude: number,
	longitude: number
): Promise<OfflineProtectedResolution> {
	const index = await loadIndex();
	const parcelPolygons = await offlineParcelPolygonsAt(latitude, longitude);
	return resolveProtectedIndex(index, parcelPolygons, latitude, longitude);
}

async function fetchCollection(
	url: string,
	signal?: AbortSignal
): Promise<GeoJsonFeatureCollection> {
	const { signal: timed, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, signal);
	try {
		const response = await fetch(url, { signal: timed });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return (await response.json()) as GeoJsonFeatureCollection;
	} finally {
		dispose();
	}
}

async function fetchLayer(
	layer: (typeof NATURE_LAYERS)[number],
	geom: string,
	budget: number,
	signal: AbortSignal | undefined,
	onProgress: ((count: number) => void) | undefined,
	alreadySaved: number
): Promise<{ features: StoredProtectedFeature[]; capped: boolean; incomplete: boolean }> {
	const features: StoredProtectedFeature[] = [];
	const seen = new Set<string>();
	let start = 0;
	let capped = false;
	let incomplete = false;

	while (features.length < budget) {
		throwIfAborted(signal);
		let page: GeoJsonFeatureCollection;
		try {
			const params = new URLSearchParams({
				geom,
				_limit: String(PAGE_LIMIT),
				_start: String(start)
			});
			page = await fetchCollection(`${APICARTO_NATURE_URL}/${layer.id}?${params}`, signal);
		} catch (error) {
			if (isAbortError(error)) throw error;
			incomplete = true;
			break;
		}

		const pageFeatures = page.features ?? [];
		let added = 0;
		for (const feature of pageFeatures) {
			if (features.length >= budget) {
				capped = true;
				break;
			}
			const stored = featureFromGeometry(layer, feature.geometry, features.length);
			if (!stored || seen.has(stored.id)) continue;
			seen.add(stored.id);
			features.push(stored);
			added += 1;
		}
		onProgress?.(alreadySaved + features.length);
		if (capped || pageFeatures.length < PAGE_LIMIT || added === 0) break;
		start += PAGE_LIMIT;
	}

	if (features.length >= budget && budget > 0) capped = true;
	return { features, capped, incomplete };
}

/**
 * Télécharge les zones protégées qui croisent le polygone et mémorise le tracé.
 * `incomplete` ou plafond : le tracé ne permet pas de conclure « aucune zone ».
 */
export async function prefetchOfflineProtectedAreas(
	ring: LngLat[],
	options?: { signal?: AbortSignal; onProgress?: (count: number) => void }
): Promise<OfflineProtectedPrefetchResult> {
	throwIfAborted(options?.signal);
	if (ring.length < 3) {
		return { saved: 0, capped: false, incomplete: true };
	}

	const geom = polygonJson(ring);
	const fetched: StoredProtectedFeature[] = [];
	let capped = false;
	let incomplete = false;

	for (const layer of NATURE_LAYERS) {
		if (fetched.length >= OFFLINE_PROTECTED_LIMIT) {
			capped = true;
			break;
		}
		const page = await fetchLayer(
			layer,
			geom,
			OFFLINE_PROTECTED_LIMIT - fetched.length,
			options?.signal,
			options?.onProgress,
			fetched.length
		);
		fetched.push(...page.features);
		if (page.capped) capped = true;
		if (page.incomplete) incomplete = true;
		if (capped || incomplete) break;
	}

	const closed = closeRing(ring);
	const bbox = bboxFor([[closed]]);
	const existing = await loadIndex();
	const featuresById = new Map(existing.features.map((feature) => [feature.id, feature]));
	for (const feature of fetched) featuresById.set(feature.id, feature);

	const coverages = existing.coverages.slice();
	if (bbox) {
		coverages.push({
			id: `cov|${bbox.west.toFixed(4)}|${bbox.south.toFixed(4)}|${bbox.east.toFixed(4)}|${bbox.north.toFixed(4)}|${closed.length}|${Date.now()}`,
			ring: simplifyRing(closed, STORED_RING_POINTS),
			complete: !capped && !incomplete,
			bbox
		});
	}

	await saveIndex({
		features: [...featuresById.values()],
		coverages
	});

	return {
		saved: fetched.length,
		capped,
		incomplete
	};
}
