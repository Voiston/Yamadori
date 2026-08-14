import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { createPointQueryCache } from '$lib/geo/providers/pointQueryCache';

/**
 * CAPAD terrestrial protected areas — Australia (DCCEEW).
 * Point-in-polygon identify. Does not map private parcels or all Crown land.
 *
 * @see https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/CAPAD/MapServer/0
 */
export const CAPAD_QUERY_URL =
	'https://gis.environment.gov.au/gispubmap/rest/services/ogc_services/CAPAD/MapServer/0/query';

const FETCH_TIMEOUT_MS = 12_000;

export type CapadAttributes = {
	NAME?: string;
	TYPE?: string;
	IUCN?: string;
	ZONE_TYPE?: string;
	STATE?: string;
	EPBC?: string;
	PA_ID?: string;
	PA_PID?: string;
};

type ArcGisFeature = { attributes?: CapadAttributes };
type ArcGisQueryResponse = {
	features?: ArcGisFeature[];
	error?: { message?: string };
};

export type CapadHit = {
	name: string;
	type: string;
	iucn: string;
	zoneType: string;
	state: string;
	epbc: string;
	paId: string;
};

const pointCache = createPointQueryCache<CapadHit[]>();

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

async function queryCapadAtLive(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CapadHit[]> {
	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		throwIfAborted(signal);
		const geometry = JSON.stringify({
			x: longitude,
			y: latitude,
			spatialReference: { wkid: 4326 }
		});
		const params = new URLSearchParams({
			f: 'json',
			geometry,
			geometryType: 'esriGeometryPoint',
			inSR: '4326',
			spatialRel: 'esriSpatialRelIntersects',
			outFields: 'NAME,TYPE,IUCN,ZONE_TYPE,STATE,EPBC,PA_ID,PA_PID',
			returnGeometry: 'false',
			resultRecordCount: '8'
		});

		const response = await fetch(`${CAPAD_QUERY_URL}?${params}`, { signal });
		if (!response.ok) {
			throw new Error(`capad_http_${response.status}`);
		}
		const data = (await response.json()) as ArcGisQueryResponse;
		if (data.error) {
			throw new Error(data.error.message ?? 'capad_query_error');
		}

		const hits: CapadHit[] = [];
		for (const feature of data.features ?? []) {
			const attrs = feature.attributes ?? {};
			hits.push({
				name: asString(attrs.NAME),
				type: asString(attrs.TYPE),
				iucn: asString(attrs.IUCN),
				zoneType: asString(attrs.ZONE_TYPE),
				state: asString(attrs.STATE),
				epbc: asString(attrs.EPBC),
				paId: asString(attrs.PA_ID) || asString(attrs.PA_PID)
			});
		}
		return hits;
	} finally {
		dispose();
	}
}

export async function queryCapadAt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CapadHit[]> {
	return pointCache.getOrFetch(latitude, longitude, () =>
		queryCapadAtLive(latitude, longitude, options)
	);
}

/** Session / tests. */
export function clearCapadPointCache(): void {
	pointCache.clear();
}
