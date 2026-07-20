import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit
} from '$lib/types/harvest-ethics';
import { emptyZoneStatus } from '$lib/geo/providers/protected/eea';
import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';

/**
 * GB protected-area scan — England (Natural England), Scotland (NatureScot),
 * Wales (NRW DataMapWales), Northern Ireland (NIEA ASSI).
 *
 * SSSI / ASSI / NNR → rnn (veto), National Parks → pn (veto).
 */

// --- England (Natural England ArcGIS FeatureServers, OGL) ---
const ENGLAND_SSSI_QUERY_URL =
	'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/SSSI_England/FeatureServer/0/query';
const ENGLAND_NATIONAL_PARKS_QUERY_URL =
	'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Parks_England/FeatureServer/0/query';
const ENGLAND_NNR_QUERY_URL =
	'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Nature_Reserves_England/FeatureServer/0/query';

// --- Scotland (NatureScot open ArcGIS) ---
const SCOTLAND_SSSI_QUERY_URL =
	'https://services1.arcgis.com/LM9GyVFsughzHdbO/arcgis/rest/services/Sites_of_Special_Scientific_Interest/FeatureServer/0/query';
const SCOTLAND_NNR_QUERY_URL =
	'https://services1.arcgis.com/LM9GyVFsughzHdbO/arcgis/rest/services/National_Nature_Reserves/FeatureServer/0/query';
const SCOTLAND_NP_QUERY_URL =
	'https://services1.arcgis.com/LM9GyVFsughzHdbO/arcgis/rest/services/NN_NP_Data/FeatureServer/0/query';

// --- Wales (NRW via DataMapWales GeoServer WFS) ---
const WALES_WFS_BASE = 'https://datamap.gov.wales/geoserver/wfs';
const WALES_SSSI_TYPENAME = 'inspire-nrw:NRW_SSSI';
const WALES_NP_TYPENAME = 'inspire-nrw:NRW_NATIONAL_PARK';
const WALES_NNR_TYPENAME = 'inspire-nrw:NRW_NNR';

// --- Northern Ireland (NIEA / DAERA ASSI, OGL) ---
const NI_ASSI_QUERY_URL =
	'https://services-eu1.arcgis.com/d5l49Upuvx1Y6xxs/arcgis/rest/services/ASSI/FeatureServer/0/query';

const FETCH_TIMEOUT_MS = 12_000;
const VETO_CARD_IDS: ProtectedZoneCardId[] = ['pn', 'rnn'];

/** Approximate nation bboxes inside GB (exclusive-ish; border edges may dual-scan). */
const NI_BBOX = { minLat: 54.0, maxLat: 55.4, minLon: -8.3, maxLon: -5.35 } as const;
const WALES_BBOX = { minLat: 51.25, maxLat: 53.5, minLon: -5.5, maxLon: -2.65 } as const;
const SCOTLAND_BBOX = { minLat: 54.6, maxLat: 60.9, minLon: -8.7, maxLon: -0.7 } as const;
const ENGLAND_BBOX = { minLat: 49.9, maxLat: 55.9, minLon: -6.5, maxLon: 2.0 } as const;

export type GbNation = 'england' | 'scotland' | 'wales' | 'ni';

type ArcGisFeature = { attributes?: Record<string, unknown> };
type ArcGisQueryResponse = {
	features?: ArcGisFeature[];
	error?: { message?: string };
};

type WfsFeatureCollection = {
	features?: Array<{ properties?: Record<string, unknown> }>;
};

function inBbox(
	latitude: number,
	longitude: number,
	bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number }
): boolean {
	return (
		latitude >= bbox.minLat &&
		latitude <= bbox.maxLat &&
		longitude >= bbox.minLon &&
		longitude <= bbox.maxLon
	);
}

/**
 * Resolve which GB nation(s) to scan. Exported for smoke tests and cadastre viewers.
 */
export function resolveGbNations(latitude: number, longitude: number): GbNation[] {
	if (inBbox(latitude, longitude, NI_BBOX)) return ['ni'];

	const nations: GbNation[] = [];
	if (inBbox(latitude, longitude, WALES_BBOX)) nations.push('wales');
	// Scotland north of ~55.0, or Galloway west of -4 below that.
	if (
		inBbox(latitude, longitude, SCOTLAND_BBOX) &&
		(latitude >= 55.0 || longitude <= -4.0)
	) {
		nations.push('scotland');
	}
	if (inBbox(latitude, longitude, ENGLAND_BBOX)) {
		const inWalesOnly = nations.includes('wales') && !nations.includes('scotland');
		const inScotlandOnly = nations.includes('scotland') && latitude >= 55.2;
		if (!inWalesOnly && !inScotlandOnly) nations.push('england');
	}

	// Border ambiguity: keep both when Wales/England or Scotland/England overlap.
	if (nations.length === 0 && inBbox(latitude, longitude, ENGLAND_BBOX)) {
		nations.push('england');
	}
	return nations;
}

/** Primary GB nation for UI (viewer links, overlays). NI wins when detected. */
export function resolveGbNation(latitude: number, longitude: number): GbNation | null {
	const nations = resolveGbNations(latitude, longitude);
	if (nations.includes('ni')) return 'ni';
	if (nations.includes('scotland')) return 'scotland';
	if (nations.includes('wales')) return 'wales';
	if (nations.includes('england')) return 'england';
	return null;
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
}

async function queryArcGisHits(
	url: string,
	nameFields: string[],
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<string[]> {
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
		outFields: nameFields.join(','),
		returnGeometry: 'false',
		resultRecordCount: '5'
	});

	const response = await fetch(`${url}?${params}`, { signal });
	if (!response.ok) return [];
	const data = (await response.json()) as ArcGisQueryResponse;
	if (data.error) return [];

	const names: string[] = [];
	for (const feature of data.features ?? []) {
		const attrs = feature.attributes ?? {};
		let name = '';
		for (const field of nameFields) {
			name = asString(attrs[field]);
			if (name) break;
		}
		if (name) names.push(name);
	}
	return names;
}

async function queryWalesWfsHits(
	typeName: string,
	nameFields: string[],
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<string[]> {
	// Tiny bbox around the point (EPSG:4326) — GeoServer WFS point-in-polygon.
	const d = 0.00015;
	const bbox = `${longitude - d},${latitude - d},${longitude + d},${latitude + d},EPSG:4326`;
	const params = new URLSearchParams({
		service: 'WFS',
		version: '2.0.0',
		request: 'GetFeature',
		typeNames: typeName,
		outputFormat: 'application/json',
		srsName: 'EPSG:4326',
		bbox,
		count: '5',
		propertyName: nameFields.join(',')
	});

	const response = await fetch(`${WALES_WFS_BASE}?${params}`, { signal });
	if (!response.ok) return [];
	const data = (await response.json()) as WfsFeatureCollection;

	const names: string[] = [];
	for (const feature of data.features ?? []) {
		const props = feature.properties ?? {};
		let name = '';
		for (const field of nameFields) {
			name = asString(props[field]);
			if (name) break;
		}
		if (name) names.push(name);
	}
	return names;
}

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'pn':
			return m.veto_zone_pn();
		case 'rnn':
			return m.veto_zone_rnn();
		default:
			return cardId;
	}
}

async function scanEngland(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ sssi: string[]; parks: string[]; nnr: string[] }> {
	const [sssi, parks, nnr] = await Promise.all([
		queryArcGisHits(ENGLAND_SSSI_QUERY_URL, ['SSSI_NAME', 'NAME'], latitude, longitude, signal),
		queryArcGisHits(ENGLAND_NATIONAL_PARKS_QUERY_URL, ['NAME', 'NP_NAME'], latitude, longitude, signal),
		queryArcGisHits(ENGLAND_NNR_QUERY_URL, ['NNR_NAME', 'NAME'], latitude, longitude, signal)
	]);
	return { sssi, parks, nnr };
}

async function scanScotland(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ sssi: string[]; parks: string[]; nnr: string[] }> {
	const [sssi, parks, nnr] = await Promise.all([
		queryArcGisHits(SCOTLAND_SSSI_QUERY_URL, ['NAME'], latitude, longitude, signal),
		queryArcGisHits(SCOTLAND_NP_QUERY_URL, ['NAME'], latitude, longitude, signal),
		queryArcGisHits(SCOTLAND_NNR_QUERY_URL, ['NAME'], latitude, longitude, signal)
	]);
	return { sssi, parks, nnr };
}

async function scanWales(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ sssi: string[]; parks: string[]; nnr: string[] }> {
	const [sssi, parks, nnr] = await Promise.all([
		queryWalesWfsHits(WALES_SSSI_TYPENAME, ['sssi_name'], latitude, longitude, signal),
		queryWalesWfsHits(WALES_NP_TYPENAME, ['np_name'], latitude, longitude, signal),
		queryWalesWfsHits(WALES_NNR_TYPENAME, ['NNR_Name'], latitude, longitude, signal)
	]);
	return { sssi, parks, nnr };
}

async function scanNorthernIreland(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<{ sssi: string[]; parks: string[]; nnr: string[] }> {
	const assi = await queryArcGisHits(NI_ASSI_QUERY_URL, ['NAME'], latitude, longitude, signal);
	return { sssi: assi, parks: [], nnr: [] };
}

/**
 * Live GB protected-area scan. Coverage is `full` when the point falls in a
 * scanned nation (England, Scotland, Wales, or Northern Ireland).
 */
export async function scanProtectedAreasGb(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);

	const nations = resolveGbNations(latitude, longitude);

	if (nations.length === 0) {
		return {
			scannedAt: new Date().toISOString(),
			hits: [],
			veto: false,
			zoneStatus: emptyZoneStatus(),
			fromCache: false,
			coverage: 'partial'
		};
	}

	// Primary nation first; second (border) nation only if primary has no certain veto.
	const primary = resolveGbNation(latitude, longitude);
	const ordered =
		primary && nations.includes(primary)
			? [primary, ...nations.filter((n) => n !== primary)]
			: nations;

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const sssi: string[] = [];
		const parks: string[] = [];
		const nnr: string[] = [];

		for (const nation of ordered) {
			const result =
				nation === 'scotland'
					? await scanScotland(latitude, longitude, signal)
					: nation === 'wales'
						? await scanWales(latitude, longitude, signal)
						: nation === 'ni'
							? await scanNorthernIreland(latitude, longitude, signal)
							: await scanEngland(latitude, longitude, signal);

			sssi.push(...result.sssi);
			parks.push(...result.parks);
			nnr.push(...result.nnr);

			const certainVeto =
				sssi.length > 0 || nnr.length > 0 || parks.length > 0;
			if (certainVeto) break;
		}

		const zoneStatus = emptyZoneStatus();
		if (sssi.length > 0 || nnr.length > 0) zoneStatus.rnn = 'certain';
		if (parks.length > 0) zoneStatus.pn = 'certain';

		const hits: ProtectedZoneHit[] = [];
		if (zoneStatus.pn !== 'clear') {
			hits.push({
				id: 'pn',
				label: parks[0] ? `${cardLabel('pn')}: ${parks[0]}` : cardLabel('pn'),
				level: 'veto'
			});
		}
		if (zoneStatus.rnn !== 'clear') {
			const detail = sssi[0] || nnr[0];
			hits.push({
				id: 'rnn',
				label: detail ? `${cardLabel('rnn')}: ${detail}` : cardLabel('rnn'),
				level: 'veto'
			});
		}

		const veto = VETO_CARD_IDS.some((cardId) => zoneStatus[cardId] !== 'clear');

		return {
			scannedAt: new Date().toISOString(),
			hits,
			veto,
			zoneStatus,
			fromCache: false,
			coverage: 'full'
		};
	} finally {
		dispose();
	}
}
