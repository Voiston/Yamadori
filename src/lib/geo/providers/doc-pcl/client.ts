import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { createPointQueryCache } from '$lib/geo/providers/pointQueryCache';

/**
 * DOC Public Conservation Areas (NaPALIS) — New Zealand.
 * Point-in-polygon identify; Crown copyright. Does not map all Crown / private land.
 *
 * @see https://mapserver.doc.govt.nz/arcgis/rest/services/Vector/PublicConservationAreas/MapServer/0
 */
export const DOC_PCL_QUERY_URL =
	'https://mapserver.doc.govt.nz/arcgis/rest/services/Vector/PublicConservationAreas/MapServer/0/query';

const FETCH_TIMEOUT_MS = 12_000;

export type DocPclAttributes = {
	Name?: string;
	Type?: string;
	Section?: string;
	Legislation?: string;
	NaPALIS_ID?: number | string;
	Conservation_Unit_Number?: string;
};

type ArcGisFeature = { attributes?: DocPclAttributes };
type ArcGisQueryResponse = {
	features?: ArcGisFeature[];
	error?: { message?: string };
};

export type DocPclHit = {
	name: string;
	type: string;
	section: string;
	legislation: string;
	napalisId: string;
	unitNumber: string;
};

const pointCache = createPointQueryCache<DocPclHit[]>();

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

async function queryDocPclAtLive(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<DocPclHit[]> {
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
			outFields: 'Name,Type,Section,Legislation,NaPALIS_ID,Conservation_Unit_Number',
			returnGeometry: 'false',
			resultRecordCount: '8'
		});

		const response = await fetch(`${DOC_PCL_QUERY_URL}?${params}`, { signal });
		if (!response.ok) {
			throw new Error(`doc_pcl_http_${response.status}`);
		}
		const data = (await response.json()) as ArcGisQueryResponse;
		if (data.error) {
			throw new Error(data.error.message ?? 'doc_pcl_query_error');
		}

		const hits: DocPclHit[] = [];
		for (const feature of data.features ?? []) {
			const attrs = feature.attributes ?? {};
			hits.push({
				name: asString(attrs.Name),
				type: asString(attrs.Type),
				section: asString(attrs.Section),
				legislation: asString(attrs.Legislation),
				napalisId: asString(attrs.NaPALIS_ID),
				unitNumber: asString(attrs.Conservation_Unit_Number)
			});
		}
		return hits;
	} finally {
		dispose();
	}
}

export async function queryDocPclAt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<DocPclHit[]> {
	return pointCache.getOrFetch(latitude, longitude, () =>
		queryDocPclAtLive(latitude, longitude, options)
	);
}

/** Session / tests. */
export function clearDocPclPointCache(): void {
	pointCache.clear();
}
