import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.7.8 (bonsai field app)';

/**
 * FPS Finance CadGIS — INSPIRE Cadastral Parcels MapServer identify (no token).
 * https://finance.belgium.be/en/experts-partners/open-data-patrimony/datasets/cadastral-map/web-services
 */
const CADGIS_IDENTIFY_URL =
	'https://ccff02.minfin.fgov.be/geoservices/arcgis/rest/services/INSPIRE/CP/MapServer/identify';

export function isInBeCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.BE);
}

type IdentifyAttributes = Record<string, string | number | null | undefined>;

type IdentifyResult = {
	layerId?: number;
	layerName?: string;
	attributes?: IdentifyAttributes;
};

type IdentifyResponse = {
	results?: IdentifyResult[];
};

function attrString(attrs: IdentifyAttributes | undefined, ...keys: string[]): string {
	if (!attrs) return '';
	for (const key of keys) {
		const value = attrs[key];
		if (value == null) continue;
		const text = String(value).trim();
		if (text && text !== 'Null' && text !== 'null') return text;
	}
	return '';
}

function pickParcel(results: IdentifyResult[]): IdentifyResult | null {
	return (
		results.find((r) => (r.layerName ?? '').toLowerCase().includes('parcel')) ??
		results.find((r) => attrString(r.attributes, 'nationalCadastralReference')) ??
		null
	);
}

function pickZoning(results: IdentifyResult[]): IdentifyResult | null {
	return (
		results.find((r) => (r.layerName ?? '').toLowerCase().includes('zoning')) ??
		results.find((r) =>
			attrString(r.attributes, 'nationalCadastalZoningReference', 'nationalCadastralZoningReference')
		) ??
		null
	);
}

async function reverseCommune(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<string> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	return (
		a.village?.trim() ||
		a.town?.trim() ||
		a.municipality?.trim() ||
		a.city?.trim() ||
		a.city_district?.trim() ||
		''
	);
}

async function identifyParcel(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ parcelNumber: string; section: string } | null> {
	const delta = 0.01;
	const params = new URLSearchParams({
		geometry: `${longitude},${latitude}`,
		geometryType: 'esriGeometryPoint',
		sr: '4326',
		layers: 'all',
		tolerance: '5',
		mapExtent: `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`,
		imageDisplay: '400,400,96',
		returnGeometry: 'false',
		f: 'json'
	});

	const response = await fetch(`${CADGIS_IDENTIFY_URL}?${params}`, {
		signal,
		headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
	});
	if (!response.ok) return null;

	const data = (await response.json()) as IdentifyResponse;
	const results = data.results ?? [];
	if (results.length === 0) return null;

	const parcel = pickParcel(results);
	const zoning = pickZoning(results);
	const parcelNumber =
		attrString(parcel?.attributes, 'nationalCadastralReference', 'label') ||
		attrString(parcel?.attributes, 'inspireId_localId');
	if (!parcelNumber) return null;

	const section =
		attrString(
			zoning?.attributes,
			'nationalCadastalZoningReference',
			'nationalCadastralZoningReference',
			'label'
		) || attrString(parcel?.attributes, 'zoning');

	return { parcelNumber, section };
}

/**
 * Belgium: nationwide CadGIS INSPIRE parcel identify (no owner data).
 */
export async function lookupCadastreBe(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInBeCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const identified = await identifyParcel(latitude, longitude, signal);
		if (!identified) return null;

		const commune = await reverseCommune(latitude, longitude, signal);

		return {
			commune,
			section: identified.section,
			parcelNumber: identified.parcelNumber,
			codeInsee: '',
			zoneType: 'private',
			fetchedAt: new Date().toISOString()
		};
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}
