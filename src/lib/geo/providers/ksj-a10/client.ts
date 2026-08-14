import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { createPointQueryCache } from '$lib/geo/providers/pointQueryCache';
import { pointInGeoJsonGeometry } from '$lib/geo/providers/ksj-a10/pointInPolygon';

/**
 * Japan natural park regions — static GeoJSON (no API key).
 * Built by `npm run build:jp-ksj` from MOE national-park polygons (+ optional KSJ A10).
 * Compatible with a 100% frontend / Capacitor app.
 *
 * @see static/jp-ksj-a10/README.md
 * @see https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-A10-v4_1.html
 */
function staticParksUrl(): string {
	// Avoid `$app/paths` here so unit tests can import this module without SvelteKit.
	const base =
		(typeof import.meta !== 'undefined' &&
			(import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
		'/';
	const root = base.endsWith('/') ? base.slice(0, -1) : base;
	return `${root}/jp-ksj-a10/natural-parks.geojson.gz`;
}

export const KSJ_A10_STATIC_URL = staticParksUrl();

const FETCH_TIMEOUT_MS = 20_000;

export type KsjA10LayerKind = 'region' | 'special' | 'strict' | 'unknown';

export type KsjA10Hit = {
	name: string;
	prefectureCode: string;
	layerNo: number;
	layerKind: KsjA10LayerKind;
	objectId: string;
	areaHa: number | null;
};

type GeoJsonFeature = {
	type?: string;
	properties?: Record<string, unknown>;
	geometry?: { type?: string; coordinates?: unknown };
};

type GeoJsonResponse = {
	type?: string;
	features?: GeoJsonFeature[];
};

const pointCache = createPointQueryCache<KsjA10Hit[]>();

/** In-memory FeatureCollection after first successful fetch. */
let parksCollection: GeoJsonResponse | null = null;
let parksLoadPromise: Promise<GeoJsonResponse> | null = null;

async function gunzipUtf8(buffer: ArrayBuffer): Promise<string> {
	if (typeof DecompressionStream !== 'undefined') {
		const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
		return await new Response(stream).text();
	}
	// Node / Vitest fallback (no DecompressionStream).
	const { gunzipSync } = await import('node:zlib');
	return gunzipSync(Buffer.from(buffer)).toString('utf8');
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

function asNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const n = Number(value);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

/**
 * LAYER_NO last two digits: 11 = 自然公園地域, 12 = 特別地域, 13 = 特別保護地区.
 */
export function layerKindFromLayerNo(layerNo: number | null): KsjA10LayerKind {
	if (layerNo == null || !Number.isFinite(layerNo)) return 'unknown';
	const suffix = Math.abs(Math.trunc(layerNo)) % 100;
	if (suffix === 13) return 'strict';
	if (suffix === 12) return 'special';
	if (suffix === 11) return 'region';
	return 'unknown';
}

function featureToHit(feature: GeoJsonFeature): KsjA10Hit | null {
	const props = feature.properties ?? {};
	const name =
		asString(props.OBJ_NAME_ja) ||
		asString(props.OBJ_NAME) ||
		asString(props.obj_name_ja) ||
		asString(props.obj_name) ||
		asString(props.name);
	const layerNo = asNumber(props.LAYER_NO) ?? asNumber(props.layer_no);
	const grade = asString(props.GRADE) || asString(props.grade);
	let kind = layerKindFromLayerNo(layerNo);
	if (kind === 'unknown' && grade) {
		if (grade.includes('特別保護')) kind = 'strict';
		else if (grade.includes('特別') || grade.includes('種')) kind = 'special';
		else kind = 'region';
	}
	const objectId =
		asString(props.OBJECTID) || asString(props.objectid) || asString(props.OBJECT_ID);
	if (!name && layerNo == null && !objectId && kind === 'unknown') return null;

	return {
		name,
		prefectureCode: asString(props.PREFEC_CD) || asString(props.prefec_cd),
		layerNo: layerNo ?? (kind === 'strict' ? 13 : kind === 'special' ? 12 : 11),
		layerKind: kind === 'unknown' ? 'region' : kind,
		objectId,
		areaHa: asNumber(props.AREA_SIZE) ?? asNumber(props.area_size)
	};
}

async function loadParksCollection(signal?: AbortSignal): Promise<GeoJsonResponse> {
	if (parksCollection) return parksCollection;
	if (parksLoadPromise) return parksLoadPromise;

	parksLoadPromise = (async () => {
		const response = await fetch(KSJ_A10_STATIC_URL, {
			signal,
			headers: { Accept: 'application/geo+json, application/json, application/gzip' }
		});
		if (!response.ok) {
			throw new Error(`ksj_a10_static_http_${response.status}`);
		}
		const buffer = await response.arrayBuffer();
		const jsonText = await gunzipUtf8(buffer);
		const data = JSON.parse(jsonText) as GeoJsonResponse;
		parksCollection = data;
		return data;
	})();

	try {
		return await parksLoadPromise;
	} catch (error) {
		parksLoadPromise = null;
		throw error;
	}
}

/** True when the static natural-parks asset is reachable (or already cached). */
export async function hasKsjA10StaticData(options?: { signal?: AbortSignal }): Promise<boolean> {
	try {
		const data = await loadParksCollection(options?.signal);
		return Array.isArray(data.features) && data.features.length > 0;
	} catch {
		return false;
	}
}

async function queryKsjA10AtLive(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<KsjA10Hit[]> {
	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		throwIfAborted(signal);
		const data = await loadParksCollection(signal);
		const hits: KsjA10Hit[] = [];
		const seen = new Set<string>();

		for (const feature of data.features ?? []) {
			if (!pointInGeoJsonGeometry(longitude, latitude, feature.geometry)) continue;
			const hit = featureToHit(feature);
			if (!hit) continue;
			const key = hit.objectId || `${hit.name}:${hit.layerNo}`;
			if (seen.has(key)) continue;
			seen.add(key);
			hits.push(hit);
			if (hits.length >= 8) break;
		}
		return hits;
	} finally {
		dispose();
	}
}

export async function queryKsjA10At(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<KsjA10Hit[]> {
	return pointCache.getOrFetch(latitude, longitude, () =>
		queryKsjA10AtLive(latitude, longitude, options)
	);
}

/** Session / tests. */
export function clearKsjA10PointCache(): void {
	pointCache.clear();
	parksCollection = null;
	parksLoadPromise = null;
}
