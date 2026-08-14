import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.7.8 (bonsai field app)';

/**
 * PDOK BRK Kadastrale kaart WFS v5 — Perceel features (no owner data).
 * Endpoint redirected from legacy kadastralekaart path.
 * Note: EPSG:4326 bbox axis order is lat,lon (WFS 2.0).
 */
const BRK_WFS_URL = 'https://service.pdok.nl/kadaster/brk-kadastralekaart/wfs/v5_0';

export function isInNlCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.NL);
}

type PerceelProperties = {
	kadastraleGemeenteWaarde?: string;
	sectie?: string;
	perceelnummer?: number | string;
	identificatieLokaalID?: string;
	AKRKadastraleGemeenteCodeWaarde?: string;
	kadastraleGemeenteCode?: string;
};

type GeoJsonFeature = {
	properties?: PerceelProperties;
};

type GeoJsonResponse = {
	features?: GeoJsonFeature[];
};

/**
 * Netherlands: nationwide BRK parcel lookup via PDOK WFS (no owner).
 */
export async function lookupCadastreNl(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInNlCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const delta = 0.0008;
	// WFS 2.0 + EPSG:4326: axis order is latitude,longitude.
	const bbox = `${latitude - delta},${longitude - delta},${latitude + delta},${longitude + delta},EPSG:4326`;
	const params = new URLSearchParams({
		service: 'WFS',
		version: '2.0.0',
		request: 'GetFeature',
		typeNames: 'kadastralekaart:Perceel',
		srsName: 'EPSG:4326',
		bbox,
		count: '1',
		outputFormat: 'application/json'
	});

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const response = await fetch(`${BRK_WFS_URL}?${params}`, {
			signal,
			headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
		});
		if (!response.ok) return null;

		const data = (await response.json()) as GeoJsonResponse;
		const props = data.features?.[0]?.properties;
		if (!props) return null;

		const parcelNumber =
			props.perceelnummer != null
				? String(props.perceelnummer).trim()
				: (props.identificatieLokaalID?.trim() ?? '');
		if (!parcelNumber) return null;

		return {
			commune: props.kadastraleGemeenteWaarde?.trim() ?? '',
			section: props.sectie?.trim() ?? '',
			parcelNumber,
			codeInsee:
				props.AKRKadastraleGemeenteCodeWaarde?.trim() ||
				props.kadastraleGemeenteCode?.trim() ||
				'',
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
