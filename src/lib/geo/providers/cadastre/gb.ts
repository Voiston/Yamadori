import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { resolveGbNation } from '$lib/geo/providers/protected/gb';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;

/** HM Land Registry INSPIRE Index — public WFS view (England & Wales). */
const HMLR_WFS_URL =
	'https://inspire.landregistry.gov.uk/inspire/ows';

export function isInGbCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.GB);
}

export const ENGLAND_WALES_BBOX = {
	minLat: 49.9,
	maxLat: 55.8,
	minLon: -6.4,
	maxLon: 1.8
} as const;

export function isInEnglandWalesCoverage(latitude: number, longitude: number): boolean {
	if (!pointInBbox(latitude, longitude, ENGLAND_WALES_BBOX)) return false;
	const nation = resolveGbNation(latitude, longitude);
	return nation === 'england' || nation === 'wales';
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

async function reverseLocality(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<string> {
	const data = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const a = data?.address ?? {};
	return (
		a.village?.trim() ||
		a.town?.trim() ||
		a.city?.trim() ||
		a.municipality?.trim() ||
		a.county?.trim() ||
		''
	);
}

async function tryHmlrTitle(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ titleNo: string; authority: string } | null> {
	const d = 0.0002;
	const params = new URLSearchParams({
		SERVICE: 'WFS',
		VERSION: '2.0.0',
		REQUEST: 'GetFeature',
		TYPENAMES: 'cp:CadastralParcel',
		OUTPUTFORMAT: 'application/json',
		SRSNAME: 'EPSG:4326',
		BBOX: `${longitude - d},${latitude - d},${longitude + d},${latitude + d},EPSG:4326`,
		COUNT: '1'
	});

	try {
		const response = await fetch(`${HMLR_WFS_URL}?${params}`, { signal });
		if (!response.ok) return null;
		const data = (await response.json()) as {
			features?: Array<{ properties?: Record<string, unknown>; id?: string }>;
		};
		const feature = data.features?.[0];
		if (!feature) return null;
		const props = feature.properties ?? {};
		const titleNo =
			asString(props.inspireId) ||
			asString(props.nationalCadastralReference) ||
			asString(props.label) ||
			asString(feature.id);
		if (!titleNo) return null;
		const authority =
			asString(props.adminUnit) || asString(props.localAuthority) || asString(props.name) || '';
		return { titleNo, authority };
	} catch {
		return null;
	}
}

/**
 * England & Wales: try HMLR INSPIRE WFS; fall back to locality-only CadastreInfo
 * (no fake parcel number). Scotland / NI → null.
 */
export async function lookupCadastreGb(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInEnglandWalesCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const hmlr = await tryHmlrTitle(latitude, longitude, signal);
		const locality = await reverseLocality(latitude, longitude, signal);

		if (hmlr) {
			return {
				commune: hmlr.authority || locality || 'England/Wales',
				section: '—',
				parcelNumber: hmlr.titleNo,
				codeInsee: hmlr.titleNo,
				zoneType: 'private',
				fetchedAt: new Date().toISOString()
			};
		}

		if (!locality) return null;
		return {
			commune: locality,
			section: '—',
			parcelNumber: '—',
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
