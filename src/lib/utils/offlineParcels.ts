import { createStore } from 'idb-keyval';
import type { LngLat } from '$lib/utils/map/downloadRegion';
import { pointInPolygon } from '$lib/utils/map/downloadRegion';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import {
	encryptedCacheGet,
	encryptedCacheSet,
	registerGeoCacheStore
} from '$lib/utils/encryptedCacheStore';

const APICARTO_PARCELLE_URL = 'https://apicarto.ign.fr/api/cadastre/parcelle';
const APICARTO_WFS_URL = 'https://apicarto.ign.fr/api/wfs-geoportail/search';
const PUBLIC_FOREST_WFS_SOURCES = [
	'ONF.ESPACES_NATURELS:forets_publiques',
	'PROTECTEDAREAS.FORESTPUBLIQUE:forets_publiques'
] as const;

const PAGE_LIMIT = 500;
const FETCH_TIMEOUT_MS = 20_000;
/** Parcelles gardées pour une zone. Au-delà, les suivantes sont ignorées. */
export const OFFLINE_PARCEL_LIMIT = 2_000;
const FOREST_LIMIT = 200;
const STORED_RING_POINTS = 2_000;
const REQUEST_RING_POINTS = 160;
const INDEX_KEY = 'index';

const OFFLINE_PARCELS_STORE_ID = 'offline-parcels';
const parcelStore = createStore('yamadori-offline-parcels', 'features');
registerGeoCacheStore(parcelStore, OFFLINE_PARCELS_STORE_ID);

type BBox = { west: number; south: number; east: number; north: number };

export type StoredParcel = {
	id: string;
	commune: string;
	section: string;
	parcelNumber: string;
	codeInsee: string;
	bbox: BBox;
	polygons: LngLat[][][];
};

export type StoredForest = {
	id: string;
	properties: Record<string, string>;
	bbox: BBox;
	polygons: LngLat[][][];
};

export type OfflineParcelIndex = {
	parcels: StoredParcel[];
	forests: StoredForest[];
};

export type OfflineParcelHit = {
	commune: string;
	section: string;
	parcelNumber: string;
	codeInsee: string;
	forestProperties: Record<string, string> | null;
};

export type OfflineParcelPrefetchResult = {
	saved: number;
	capped: boolean;
	incomplete: boolean;
};

type GeoJsonFeature = {
	properties?: Record<string, unknown>;
	geometry?: { type?: string; coordinates?: unknown };
};

type GeoJsonFeatureCollection = {
	features?: GeoJsonFeature[];
};

const EMPTY_INDEX: OfflineParcelIndex = { parcels: [], forests: [] };

let memoryIndex: OfflineParcelIndex | null = null;

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

function pickProperty(properties: Record<string, unknown>, keys: string[]): string {
	for (const key of keys) {
		const value = asString(properties[key]);
		if (value) return value;
	}
	return '';
}

function isClosed(ring: LngLat[]): boolean {
	if (ring.length < 2) return false;
	const first = ring[0];
	const last = ring[ring.length - 1];
	return first[0] === last[0] && first[1] === last[1];
}

function perpendicularDistance(point: LngLat, start: LngLat, end: LngLat): number {
	const [x, y] = point;
	const [x1, y1] = start;
	const [x2, y2] = end;
	const dx = x2 - x1;
	const dy = y2 - y1;
	const length = Math.hypot(dx, dy);
	if (length === 0) return Math.hypot(x - x1, y - y1);
	return Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1) / length;
}

function simplifyOpen(points: LngLat[], tolerance: number): LngLat[] {
	if (points.length <= 2) return points.slice();
	let maxDistance = 0;
	let index = 0;
	const end = points.length - 1;
	for (let i = 1; i < end; i += 1) {
		const distance = perpendicularDistance(points[i], points[0], points[end]);
		if (distance > maxDistance) {
			maxDistance = distance;
			index = i;
		}
	}
	if (maxDistance > tolerance) {
		const left = simplifyOpen(points.slice(0, index + 1), tolerance);
		const right = simplifyOpen(points.slice(index), tolerance);
		return left.slice(0, -1).concat(right);
	}
	return [points[0], points[end]];
}

function thinPoints(points: LngLat[], maxPoints: number): LngLat[] {
	if (points.length <= maxPoints) return points.slice();
	const step = Math.ceil((points.length - 1) / Math.max(1, maxPoints - 1));
	const thinned: LngLat[] = [];
	for (let i = 0; i < points.length; i += step) thinned.push(points[i]);
	const tail = points[points.length - 1];
	const last = thinned[thinned.length - 1];
	if (!last || last[0] !== tail[0] || last[1] !== tail[1]) thinned.push(tail);
	if (thinned.length <= maxPoints) return thinned;
	return thinned.slice(0, maxPoints - 1).concat([tail]);
}

/** Réduit un anneau trop long. Un anneau fermé reste fermé. */
export function simplifyRing(ring: LngLat[], maxPoints: number): LngLat[] {
	if (ring.length <= maxPoints) return ring;
	const closed = isClosed(ring);
	const open = closed ? ring.slice(0, -1) : ring.slice();
	const budget = Math.max(2, maxPoints - (closed ? 1 : 0));
	if (open.length < 3) return thinPoints(ring, maxPoints);

	let tolerance = 1e-6;
	let simplified = open;
	for (let attempt = 0; attempt < 12 && simplified.length > budget; attempt += 1) {
		simplified = simplifyOpen(open, tolerance);
		tolerance *= 2;
	}

	if (simplified.length > budget || simplified.length < 2) {
		simplified = thinPoints(open, budget);
	}

	if (closed) {
		const first = simplified[0];
		const last = simplified[simplified.length - 1];
		if (first && (!last || first[0] !== last[0] || first[1] !== last[1])) {
			simplified = [...simplified, first];
		}
	}

	return simplified.length <= maxPoints ? simplified : thinPoints(ring, maxPoints);
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

function polygonContains(polygon: LngLat[][], point: LngLat): boolean {
	const [outer, ...holes] = polygon;
	if (!outer || outer.length < 3 || !pointInPolygon(point, outer)) return false;
	return !holes.some((hole) => hole.length >= 3 && pointInPolygon(point, hole));
}

function geometryContains(
	bbox: BBox,
	polygons: LngLat[][][],
	longitude: number,
	latitude: number
): boolean {
	if (!bboxContains(bbox, longitude, latitude)) return false;
	const point: LngLat = [longitude, latitude];
	return polygons.some((polygon) => polygonContains(polygon, point));
}

function closeRing(ring: LngLat[]): LngLat[] {
	if (ring.length < 3) return ring;
	if (isClosed(ring)) return ring;
	return [...ring, ring[0]];
}

function polygonJson(ring: LngLat[]): string {
	const closed = closeRing(simplifyRing(ring, REQUEST_RING_POINTS));
	return JSON.stringify({
		type: 'Polygon',
		coordinates: [closed]
	});
}

function parcelFromFeature(feature: GeoJsonFeature): StoredParcel | null {
	const properties = feature.properties ?? {};
	const section = pickProperty(properties, ['section', 'SECTION']);
	const parcelNumber = pickProperty(properties, ['numero', 'NUMERO', 'numero_parcelle']);
	if (!section || !parcelNumber) return null;
	const codeInsee = pickProperty(properties, ['code_insee', 'CODE_INSEE', 'insee', 'INSEE']);
	const commune = pickProperty(properties, ['nom_com', 'nom_commune', 'commune', 'NOM_COM']);
	const polygons = parsePolygons(feature.geometry);
	const bbox = bboxFor(polygons);
	if (!bbox) return null;
	return {
		id: `${codeInsee}|${section}|${parcelNumber}`,
		commune,
		section,
		parcelNumber,
		codeInsee,
		bbox,
		polygons
	};
}

const FOREST_PROPERTY_KEYS = [
	'regime',
	'REGIME',
	'type_regime',
	'TYPE_REGIME',
	'nature_gest',
	'NATURE_GEST',
	'nature',
	'NATURE'
] as const;

function forestFromFeature(feature: GeoJsonFeature, source: string, index: number): StoredForest | null {
	const polygons = parsePolygons(feature.geometry);
	const bbox = bboxFor(polygons);
	if (!bbox) return null;
	const properties: Record<string, string> = {};
	const sourceProperties = feature.properties ?? {};
	for (const key of FOREST_PROPERTY_KEYS) {
		const value = asString(sourceProperties[key]);
		if (value) properties[key] = value;
	}
	const regime = properties.regime || properties.REGIME || '';
	return {
		id: `${source}:${bbox.west.toFixed(4)},${bbox.south.toFixed(4)},${bbox.east.toFixed(4)},${bbox.north.toFixed(4)}:${regime}:${index}`,
		properties,
		bbox,
		polygons
	};
}

async function loadIndex(): Promise<OfflineParcelIndex> {
	if (memoryIndex) return memoryIndex;
	const stored = await encryptedCacheGet<OfflineParcelIndex>(
		parcelStore,
		OFFLINE_PARCELS_STORE_ID,
		INDEX_KEY
	);
	memoryIndex = stored ?? { parcels: [], forests: [] };
	return memoryIndex;
}

async function saveIndex(index: OfflineParcelIndex): Promise<void> {
	memoryIndex = index;
	await encryptedCacheSet(parcelStore, OFFLINE_PARCELS_STORE_ID, INDEX_KEY, index);
}

export async function clearOfflineParcelIndex(): Promise<void> {
	memoryIndex = null;
	await saveIndex(EMPTY_INDEX);
	memoryIndex = null;
}

export function parcelAtPoint(
	index: OfflineParcelIndex,
	latitude: number,
	longitude: number
): OfflineParcelHit | null {
	const parcel = index.parcels.find((entry) =>
		geometryContains(entry.bbox, entry.polygons, longitude, latitude)
	);
	if (!parcel) return null;
	const forest = index.forests.find((entry) =>
		geometryContains(entry.bbox, entry.polygons, longitude, latitude)
	);
	return {
		commune: parcel.commune,
		section: parcel.section,
		parcelNumber: parcel.parcelNumber,
		codeInsee: parcel.codeInsee,
		forestProperties: forest ? forest.properties : null
	};
}

export async function findOfflineParcelAt(
	latitude: number,
	longitude: number
): Promise<OfflineParcelHit | null> {
	const index = await loadIndex();
	return parcelAtPoint(index, latitude, longitude);
}

/** Anneaux de la parcelle qui contient le point, pour le croisement avec une zone protégée. */
export async function offlineParcelPolygonsAt(
	latitude: number,
	longitude: number
): Promise<LngLat[][][] | null> {
	const index = await loadIndex();
	if (!Array.isArray(index.parcels)) return null;
	const parcel = index.parcels.find((entry) =>
		geometryContains(entry.bbox, entry.polygons, longitude, latitude)
	);
	return parcel?.polygons ?? null;
}

async function fetchCollection(
	url: string,
	signal?: AbortSignal
): Promise<GeoJsonFeatureCollection> {
	const { signal: timed, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, signal);
	try {
		const response = await fetch(url, { signal: timed });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return (await response.json()) as GeoJsonFeatureCollection;
	} finally {
		dispose();
	}
}

function pageUrl(base: string, params: Record<string, string>): string {
	return `${base}?${new URLSearchParams(params)}`;
}

async function fetchParcels(
	geom: string,
	signal: AbortSignal | undefined,
	onProgress: ((count: number) => void) | undefined
): Promise<{ parcels: StoredParcel[]; capped: boolean; incomplete: boolean }> {
	const parcels: StoredParcel[] = [];
	const seen = new Set<string>();
	let start = 0;
	let capped = false;
	let incomplete = false;

	while (parcels.length < OFFLINE_PARCEL_LIMIT) {
		throwIfAborted(signal);
		let page: GeoJsonFeatureCollection;
		try {
			page = await fetchCollection(
				pageUrl(APICARTO_PARCELLE_URL, {
					geom,
					_limit: String(PAGE_LIMIT),
					_start: String(start)
				}),
				signal
			);
		} catch (error) {
			if (isAbortError(error)) throw error;
			incomplete = true;
			break;
		}

		const features = page.features ?? [];
		let added = 0;
		for (const feature of features) {
			if (parcels.length >= OFFLINE_PARCEL_LIMIT) {
				capped = true;
				break;
			}
			const parcel = parcelFromFeature(feature);
			if (!parcel || seen.has(parcel.id)) continue;
			seen.add(parcel.id);
			parcels.push(parcel);
			added += 1;
		}
		onProgress?.(parcels.length);
		if (capped || features.length < PAGE_LIMIT || added === 0) break;
		start += PAGE_LIMIT;
	}

	if (parcels.length >= OFFLINE_PARCEL_LIMIT) capped = true;
	return { parcels, capped, incomplete };
}

async function fetchForests(geom: string, signal?: AbortSignal): Promise<StoredForest[]> {
	const forests: StoredForest[] = [];
	const seen = new Set<string>();

	for (const source of PUBLIC_FOREST_WFS_SOURCES) {
		let start = 0;
		while (forests.length < FOREST_LIMIT) {
			throwIfAborted(signal);
			let page: GeoJsonFeatureCollection;
			try {
				page = await fetchCollection(
					pageUrl(APICARTO_WFS_URL, {
						source,
						geom,
						_limit: String(PAGE_LIMIT),
						_start: String(start)
					}),
					signal
				);
			} catch (error) {
				if (isAbortError(error)) throw error;
				break;
			}
			const features = page.features ?? [];
			let added = 0;
			for (const feature of features) {
				if (forests.length >= FOREST_LIMIT) break;
				const forest = forestFromFeature(feature, source, forests.length);
				if (!forest || seen.has(forest.id)) continue;
				seen.add(forest.id);
				forests.push(forest);
				added += 1;
			}
			if (features.length < PAGE_LIMIT || added === 0) break;
			start += PAGE_LIMIT;
		}
	}

	return forests;
}

/**
 * Télécharge les parcelles et les forêts publiques qui croisent le polygone,
 * et les fusionne avec les zones déjà enregistrées.
 */
export async function prefetchOfflineParcels(
	ring: LngLat[],
	options?: { signal?: AbortSignal; onProgress?: (count: number) => void }
): Promise<OfflineParcelPrefetchResult> {
	throwIfAborted(options?.signal);
	if (ring.length < 3) {
		return { saved: 0, capped: false, incomplete: false };
	}

	const geom = polygonJson(ring);
	const fetched = await fetchParcels(geom, options?.signal, options?.onProgress);
	const forests = await fetchForests(geom, options?.signal);
	const existing = await loadIndex();
	const parcelsById = new Map(existing.parcels.map((parcel) => [parcel.id, parcel]));
	for (const parcel of fetched.parcels) parcelsById.set(parcel.id, parcel);
	const forestsById = new Map(existing.forests.map((forest) => [forest.id, forest]));
	for (const forest of forests) forestsById.set(forest.id, forest);

	await saveIndex({
		parcels: [...parcelsById.values()],
		forests: [...forestsById.values()]
	});

	return {
		saved: fetched.parcels.length,
		capped: fetched.capped,
		incomplete: fetched.incomplete
	};
}
