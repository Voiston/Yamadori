/**
 * Shared geo.admin.ch MapServer identify helper.
 * Batches multiple BOD layer ids into one `layers=all:a,b,c` request.
 */

export const GEO_ADMIN_IDENTIFY_URL =
	'https://api3.geo.admin.ch/rest/services/api/MapServer/identify';

export type GeoAdminIdentifyResult = {
	layerBodId?: string;
	attributes?: Record<string, unknown>;
};

type IdentifyResponse = {
	results?: GeoAdminIdentifyResult[];
};

export type GeoAdminIdentifyOptions = {
	signal: AbortSignal;
	/** Pixel tolerance (default 10). */
	tolerance?: number;
	/** Degrees padding around the point for mapExtent (default 0.01). */
	pad?: number;
	/** `width,height,dpi` (default `500,500,96`). */
	imageDisplay?: string;
	lang?: string;
};

/**
 * Identify one or more layers in a single HTTP request.
 * Results keep `layerBodId` so callers can split by layer.
 */
export async function identifyGeoAdminLayers(
	layers: readonly string[],
	latitude: number,
	longitude: number,
	options: GeoAdminIdentifyOptions
): Promise<GeoAdminIdentifyResult[]> {
	if (layers.length === 0) return [];

	const pad = options.pad ?? 0.01;
	const params = new URLSearchParams({
		geometryType: 'esriGeometryPoint',
		geometry: `${longitude},${latitude}`,
		sr: '4326',
		layers: `all:${layers.join(',')}`,
		mapExtent: `${longitude - pad},${latitude - pad},${longitude + pad},${latitude + pad}`,
		imageDisplay: options.imageDisplay ?? '500,500,96',
		tolerance: String(options.tolerance ?? 10),
		returnGeometry: 'false',
		lang: options.lang ?? 'en'
	});

	const response = await fetch(`${GEO_ADMIN_IDENTIFY_URL}?${params}`, {
		signal: options.signal
	});
	if (!response.ok) return [];

	const data = (await response.json()) as IdentifyResponse;
	return (data.results ?? []).map((result) => ({
		...result,
		// Ensure layerBodId is set when the API omits it for single-layer queries.
		layerBodId:
			result.layerBodId ?? (layers.length === 1 ? layers[0] : result.layerBodId)
	}));
}

/** Filter identify results belonging to a BOD layer id (substring or exact). */
export function filterIdentifyByLayer(
	results: GeoAdminIdentifyResult[],
	layerId: string
): GeoAdminIdentifyResult[] {
	return results.filter((r) => (r.layerBodId ?? '') === layerId || (r.layerBodId ?? '').includes(layerId));
}
