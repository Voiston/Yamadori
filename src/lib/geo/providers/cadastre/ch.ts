import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import {
	parseSwissCantonCode,
	resolveSwissCanton,
	type SwissCantonCode
} from '$lib/geo/providers/ch/canton';
import {
	getOpenCantonCadastre,
	wgs84ToLv95,
	type SwissCantonCadastreConfig
} from '$lib/geo/providers/ch/cantonRegistry';
import { identifyGeoAdminLayers } from '$lib/geo/providers/ch/identify';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { isApiEnabled } from '$lib/utils/apiPolicy';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 12_000;

/** Federal cadastral surveying open identify layer (parcel number + EGRID). */
const LAYER_AV = 'ch.swisstopo-vd.amtliche-vermessung';
const LAYER_GEMEINDE = 'ch.swisstopo-vd.geometa-gemeinde';

export function isInChCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.CH);
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

function pickAttr(attrs: Record<string, unknown>, keys: string[]): string {
	for (const key of keys) {
		const direct = asString(attrs[key]);
		if (direct) return direct;
		const lower = Object.keys(attrs).find((k) => k.toLowerCase().endsWith(key.toLowerCase()));
		if (lower) {
			const value = asString(attrs[lower]);
			if (value) return value;
		}
	}
	return '';
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

async function queryCantonWfs(
	config: SwissCantonCadastreConfig,
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<CadastreInfo | null> {
	const { e, n } = wgs84ToLv95(latitude, longitude);
	const pad = 40;
	const params = new URLSearchParams({
		SERVICE: 'WFS',
		VERSION: '1.1.0',
		REQUEST: 'GetFeature',
		TYPENAME: config.typeName,
		OUTPUTFORMAT: 'application/json; subtype=geojson',
		SRSNAME: 'EPSG:2056',
		BBOX: `${e - pad},${n - pad},${e + pad},${n + pad}`,
		MAXFEATURES: '1'
	});

	const response = await fetch(`${config.endpoint}?${params}`, { signal });
	if (!response.ok) return null;
	const data = (await response.json()) as {
		features?: Array<{ properties?: Record<string, unknown> }>;
	};
	const props = data.features?.[0]?.properties;
	if (!props) return null;

	const parcelNumber = pickAttr(props, config.parcelKeys);
	const commune = pickAttr(props, config.communeKeys);
	const egrid = asString(props.egris_egrid) || asString(props.egrid);
	const bfs = asString(props.bfsnr) || asString(props.bfs);
	if (!parcelNumber && !commune) return null;

	return {
		commune: commune || 'Schweiz',
		section: config.code,
		parcelNumber: parcelNumber || '—',
		codeInsee: bfs || egrid || parcelNumber,
		zoneType: 'private',
		fetchedAt: new Date().toISOString(),
		collectStatus: 'owner_permission'
	};
}

function federalIncomplete(info: CadastreInfo | null): boolean {
	if (!info) return true;
	return info.parcelNumber === '—' || !info.parcelNumber.trim();
}

/**
 * Switzerland: federal AV identify for parcel/EGRID; if incomplete and the
 * canton has an open WFS (currently ZH/BS), enrich from the cantonal AV.
 * Outside CH bbox → null.
 */
export async function lookupCadastreCh(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInChCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		// Single identify for AV + Gemeinde (tolerance 5 covers both).
		const identifyResults = await identifyGeoAdminLayers(
			[LAYER_AV, LAYER_GEMEINDE],
			latitude,
			longitude,
			{ signal, tolerance: 5, pad: 0.002, imageDisplay: '100,100,96' }
		);

		const parcels = identifyResults.filter((r) =>
			(r.layerBodId ?? '').includes('amtliche-vermessung')
		);
		const gemeinden = identifyResults.filter((r) =>
			(r.layerBodId ?? '').includes('geometa-gemeinde')
		);

		const parcel = parcels[0]?.attributes ?? {};
		const gemeinde = gemeinden[0]?.attributes ?? {};
		const parcelNumber =
			asString(parcel.number) ||
			asString(parcel.name) ||
			asString(parcel.label) ||
			asString(parcel.egris_egrid);
		const commune =
			asString(gemeinde.gemeindename) ||
			asString(gemeinde.label) ||
			(await reverseLocality(latitude, longitude, signal));
		const codeInsee =
			asString(parcel.bfsnr) ||
			asString(gemeinde.bfs_nr) ||
			asString(gemeinde.fid) ||
			asString(parcel.egris_egrid);

		const cantonHint =
			parseSwissCantonCode(asString(parcel.ak)) ||
			parseSwissCantonCode(asString(gemeinde.kanton));

		let federal: CadastreInfo | null = null;
		if (parcelNumber && commune) {
			federal = {
				commune,
				section: cantonHint || asString(parcel.ak) || '—',
				parcelNumber,
				codeInsee: codeInsee || parcelNumber,
				zoneType: 'private',
				fetchedAt: new Date().toISOString(),
				collectStatus: 'owner_permission'
			};
		} else if (commune) {
			federal = {
				commune,
				section: cantonHint || '—',
				parcelNumber: '—',
				codeInsee: codeInsee || '',
				zoneType: 'private',
				fetchedAt: new Date().toISOString(),
				collectStatus: 'owner_permission'
			};
		}

		if (!federalIncomplete(federal)) {
			return federal;
		}

		const canton: SwissCantonCode | null =
			cantonHint ||
			(await resolveSwissCanton(latitude, longitude, {
				signal,
				hints: [asString(parcel.ak), asString(gemeinde.kanton)],
				nominatimEnabled: isApiEnabled('nominatim')
			}));

		const config = getOpenCantonCadastre(canton);
		if (config) {
			const enriched = await queryCantonWfs(config, latitude, longitude, signal);
			if (enriched) {
				return {
					...enriched,
					commune: enriched.commune !== 'Schweiz' ? enriched.commune : commune || enriched.commune,
					section: canton || enriched.section
				};
			}
		}

		return federal;
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}
