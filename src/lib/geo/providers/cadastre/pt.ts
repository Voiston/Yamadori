import type { CadastreInfo } from '$lib/types/cadastre';
import { pointInCountryBboxes } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

/**
 * DGT Cadastro Predial (INSPIRE WFS) — mainland Portugal.
 * Coverage is incomplete nationally; miss → Nominatim locality (no fake NIC).
 *
 * @see https://snicws.dgterritorio.gov.pt/geoserver/inspire/ows
 */
const WFS_URL = 'https://snicws.dgterritorio.gov.pt/geoserver/inspire/ows';
const FETCH_TIMEOUT_MS = 12_000;
/** ~110 m half-width — tight enough for a single parcel in most rural areas. */
const BBOX_HALF_DEG = 0.001;

type DgtParcelProperties = {
	nationalcadastralreference?: string;
	label?: string;
	administrativeunit?: string;
	inspireid?: string;
};

type DgtFeatureCollection = {
	features?: Array<{
		id?: string;
		properties?: DgtParcelProperties;
	}>;
	error?: { message?: string };
};

async function queryDgtParcel(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<DgtParcelProperties | null> {
	const minLon = longitude - BBOX_HALF_DEG;
	const maxLon = longitude + BBOX_HALF_DEG;
	const minLat = latitude - BBOX_HALF_DEG;
	const maxLat = latitude + BBOX_HALF_DEG;
	const params = new URLSearchParams({
		service: 'WFS',
		version: '2.0.0',
		request: 'GetFeature',
		typeNames: 'inspire:cadastralparcel',
		outputFormat: 'application/json',
		count: '3',
		srsName: 'EPSG:4326',
		bbox: `${minLon},${minLat},${maxLon},${maxLat},EPSG:4326`
	});

	const response = await fetch(`${WFS_URL}?${params}`, { signal });
	if (!response.ok) {
		throw new Error(`dgt_wfs_http_${response.status}`);
	}
	const data = (await response.json()) as DgtFeatureCollection;
	const feature = data.features?.[0];
	return feature?.properties ?? null;
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ commune: string; municipality: string }> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	const commune =
		a.village?.trim() ||
		a.suburb?.trim() ||
		a.town?.trim() ||
		a.city?.trim() ||
		a.municipality?.trim() ||
		'';
	return { commune, municipality: a.municipality?.trim() || a.county?.trim() || '' };
}

/**
 * Portugal: DGT parcel when available; otherwise Nominatim locality (partial cadastre).
 */
export async function lookupCadastrePt(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!pointInCountryBboxes(latitude, longitude, 'PT')) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		let props: DgtParcelProperties | null = null;
		try {
			props = await queryDgtParcel(latitude, longitude, signal);
		} catch (error) {
			if (isAbortError(error)) throw error;
			props = null;
		}

		const nic = props?.nationalcadastralreference?.trim() || props?.label?.trim() || '';
		const { commune, municipality } = await reverseLocality(latitude, longitude, signal);
		const locality = commune || municipality || props?.administrativeunit?.trim() || '';

		if (!nic && !locality) return null;

		return {
			commune: locality || 'Portugal',
			section: props?.administrativeunit?.trim() || municipality || 'PT',
			parcelNumber: nic || '—',
			codeInsee: nic || '',
			zoneType: 'private',
			fetchedAt: new Date().toISOString(),
			unitName: nic || undefined,
			designation: props?.inspireid?.trim() || undefined
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}
