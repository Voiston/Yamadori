import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { createPointQueryCache } from '$lib/geo/providers/pointQueryCache';

/**
 * USGS National Map — PAD-US Fee Managers (public land ownership footprint).
 * Point-in-polygon identify; no API key. Designations that exist only as
 * overlapping Designation features (not fee) may be missed — Des_Tp on fee
 * still catches many NP / NF / WA cases.
 *
 * @see https://www.usgs.gov/programs/gap-analysis-project/science/pad-us-web-services
 */
export const PADUS_FEE_QUERY_URL =
	'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer/0/query';

const FETCH_TIMEOUT_MS = 12_000;

export type PadusFeeAttributes = {
	Mang_Name?: string;
	Own_Name?: string;
	Mang_Type?: string;
	Own_Type?: string;
	Unit_Nm?: string;
	Loc_Nm?: string;
	Des_Tp?: string;
	State_Nm?: string;
	FeatClass?: string;
	GAP_Sts?: string;
};

type ArcGisFeature = { attributes?: PadusFeeAttributes };
type ArcGisQueryResponse = {
	features?: ArcGisFeature[];
	error?: { message?: string };
};

export type PadusFeeHit = {
	managerName: string;
	ownerName: string;
	managerType: string;
	unitName: string;
	designation: string;
	stateName: string;
};

const pointCache = createPointQueryCache<PadusFeeHit[]>();

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

async function queryPadusFeeAtLive(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<PadusFeeHit[]> {
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
			outFields: 'Mang_Name,Own_Name,Mang_Type,Own_Type,Unit_Nm,Loc_Nm,Des_Tp,State_Nm,FeatClass,GAP_Sts',
			returnGeometry: 'false',
			resultRecordCount: '8'
		});

		const response = await fetch(`${PADUS_FEE_QUERY_URL}?${params}`, { signal });
		if (!response.ok) {
			throw new Error(`padus_http_${response.status}`);
		}
		const data = (await response.json()) as ArcGisQueryResponse;
		if (data.error) {
			throw new Error(data.error.message ?? 'padus_query_error');
		}

		const hits: PadusFeeHit[] = [];
		for (const feature of data.features ?? []) {
			const attrs = feature.attributes ?? {};
			const managerName = asString(attrs.Mang_Name);
			const unitName = asString(attrs.Unit_Nm) || asString(attrs.Loc_Nm);
			hits.push({
				managerName,
				ownerName: asString(attrs.Own_Name) || managerName,
				managerType: asString(attrs.Mang_Type),
				unitName,
				designation: asString(attrs.Des_Tp),
				stateName: asString(attrs.State_Nm)
			});
		}
		return hits;
	} finally {
		dispose();
	}
}

export async function queryPadusFeeAt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<PadusFeeHit[]> {
	return pointCache.getOrFetch(latitude, longitude, () =>
		queryPadusFeeAtLive(latitude, longitude, options)
	);
}

/** Session / tests. */
export function clearPadusPointCache(): void {
	pointCache.clear();
}
