import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';
import { createPointQueryCache } from '$lib/geo/providers/pointQueryCache';

/**
 * ECCC CPCAD — Canadian Protected and Conserved Areas Database.
 * Point-in-polygon identify; Open Government Licence. Does not map all Crown land.
 *
 * @see https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWS_SCF/CPCAD/MapServer/0
 */
export const CPCAD_QUERY_URL =
	'https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWS_SCF/CPCAD/MapServer/0/query';

const FETCH_TIMEOUT_MS = 12_000;

export type CpcadAttributes = {
	NAME_E?: string;
	NAME_F?: string;
	TYPE_E?: string;
	IUCN_CAT?: number | string;
	OWNER_E?: string;
	MGMT_E?: string;
	IPCA?: number | string;
	JUR_ID?: string;
	MECH_E?: string;
	PA_OECM_DF?: number | string;
	GOV_TYPE?: number | string;
};

type ArcGisFeature = { attributes?: CpcadAttributes };
type ArcGisQueryResponse = {
	features?: ArcGisFeature[];
	error?: { message?: string };
};

export type CpcadHit = {
	nameEn: string;
	nameFr: string;
	typeEn: string;
	iucnCat: number | null;
	owner: string;
	manager: string;
	ipca: boolean;
	jurId: string;
	mechanism: string;
	/** 1 = protected area, other = OECM / conserved when present. */
	paOecm: number | null;
};

const pointCache = createPointQueryCache<CpcadHit[]>();

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

async function queryCpcadAtLive(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CpcadHit[]> {
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
			outFields:
				'NAME_E,NAME_F,TYPE_E,IUCN_CAT,OWNER_E,MGMT_E,IPCA,JUR_ID,MECH_E,PA_OECM_DF,GOV_TYPE',
			returnGeometry: 'false',
			resultRecordCount: '8'
		});

		const response = await fetch(`${CPCAD_QUERY_URL}?${params}`, { signal });
		if (!response.ok) {
			throw new Error(`cpcad_http_${response.status}`);
		}
		const data = (await response.json()) as ArcGisQueryResponse;
		if (data.error) {
			throw new Error(data.error.message ?? 'cpcad_query_error');
		}

		const hits: CpcadHit[] = [];
		for (const feature of data.features ?? []) {
			const attrs = feature.attributes ?? {};
			const ipcaRaw = asNumber(attrs.IPCA);
			hits.push({
				nameEn: asString(attrs.NAME_E),
				nameFr: asString(attrs.NAME_F),
				typeEn: asString(attrs.TYPE_E),
				iucnCat: asNumber(attrs.IUCN_CAT),
				owner: asString(attrs.OWNER_E),
				manager: asString(attrs.MGMT_E) || asString(attrs.OWNER_E),
				ipca: ipcaRaw === 1,
				jurId: asString(attrs.JUR_ID),
				mechanism: asString(attrs.MECH_E),
				paOecm: asNumber(attrs.PA_OECM_DF)
			});
		}
		return hits;
	} finally {
		dispose();
	}
}

export async function queryCpcadAt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CpcadHit[]> {
	return pointCache.getOrFetch(latitude, longitude, () =>
		queryCpcadAtLive(latitude, longitude, options)
	);
}

/** Session / tests. */
export function clearCpcadPointCache(): void {
	pointCache.clear();
}
