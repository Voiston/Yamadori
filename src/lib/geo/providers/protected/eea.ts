import * as m from '$lib/paraglide/messages.js';
import type {
	ProtectedAreaScan,
	ProtectedZoneCardId,
	ProtectedZoneHit,
	ProtectedZonePresence
} from '$lib/types/harvest-ethics';
import { createTimedAbortSignal, throwIfAborted } from '$lib/utils/abortSignal';

/**
 * EEA Discomap ArcGIS REST services (public, no API key). Used for ES / IT / DE
 * where no cheaper national point API is available.
 *
 * - Natura 2000 sites: ProtectedSites/Natura2000Sites/MapServer, layer 2
 *   ("Habitats and Birds Directive Sites", combined SAC/SCI + SPA). Field
 *   `SITETYPE` (A = habitats only, B = birds only, C = both) — presence of any
 *   value means the point/area falls inside a Natura 2000 site.
 * - Nationally designated areas (CDDA): ProtectedSites/CDDA_Dyna_WM/MapServer,
 *   layer 4 ("Large scale viewing", the most detailed polygon layer). Field
 *   `iucnCategory` (Ia..VI) is used as a proxy for severity: national-park /
 *   strict-reserve categories (Ia, Ib, II) trigger a veto like French PN/RNN,
 *   the more permissive categories (III..VI) are treated as caution like
 *   PNR/regional reserves.
 *
 * Both endpoints verified live (query, not just capabilities) against Doñana
 * (ES) — https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/…
 */
const NATURA2000_QUERY_URL =
	'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer/2/query';
const CDDA_QUERY_URL =
	'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/CDDA_Dyna_WM/MapServer/4/query';

const FETCH_TIMEOUT_MS = 8_000;
/** ~120 m half-side envelope used as a “near boundary” proxy when the exact point misses (no parcel geometry available outside FR). */
const BUFFER_DEGREES = 0.0011;

const VETO_CARD_IDS: ProtectedZoneCardId[] = ['pn', 'rnn'];

type ArcGisFeature<T> = { attributes: T };
type ArcGisQueryResponse<T> = {
	features?: ArcGisFeature<T>[];
	error?: { message?: string };
};

export function emptyZoneStatus(): Record<ProtectedZoneCardId, ProtectedZonePresence> {
	return {
		pn: 'clear',
		rnn: 'clear',
		pnr: 'clear',
		rnr_regional: 'clear',
		natura2000: 'clear',
		znieff: 'clear',
		appb: 'clear',
		nps: 'clear',
		wilderness: 'clear',
		usfs: 'clear',
		blm: 'clear',
		state_park: 'clear',
		tribal: 'clear',
		parks_canada: 'clear',
		provincial_park: 'clear',
		nwa: 'clear',
		ipca: 'clear',
		crown_unverified: 'clear',
		doc_national_park: 'clear',
		doc_conservation: 'clear',
		whenua_rahui: 'clear',
		outside_pcl: 'clear',
		capad_national_park: 'clear',
		capad_conservation: 'clear',
		capad_ipa: 'clear',
		outside_capad: 'clear',
		ksj_national_park: 'clear',
		ksj_special_zone: 'clear',
		ksj_prefectural_park: 'clear',
		outside_ksj: 'clear'
	};
}

function pointGeometryParam(latitude: number, longitude: number): string {
	return `${longitude},${latitude}`;
}

function envelopeGeometryParam(latitude: number, longitude: number): string {
	return JSON.stringify({
		xmin: longitude - BUFFER_DEGREES,
		ymin: latitude - BUFFER_DEGREES,
		xmax: longitude + BUFFER_DEGREES,
		ymax: latitude + BUFFER_DEGREES
	});
}

async function queryField(
	url: string,
	field: string,
	geometry: string,
	geometryType: 'esriGeometryPoint' | 'esriGeometryEnvelope',
	signal: AbortSignal
): Promise<string[]> {
	const params = new URLSearchParams({
		f: 'json',
		where: '1=1',
		geometry,
		geometryType,
		inSR: '4326',
		spatialRel: 'esriSpatialRelIntersects',
		outFields: field,
		returnGeometry: 'false'
	});

	const response = await fetch(`${url}?${params}`, { signal });
	if (!response.ok) return [];
	const data = (await response.json()) as ArcGisQueryResponse<Record<string, string | undefined>>;
	if (data.error) return [];
	return (data.features ?? [])
		.map((feature) => feature.attributes[field])
		.filter((value): value is string => Boolean(value && value.trim()));
}

/** Maps a CDDA IUCN management category to a French-style protected-zone card. */
function cddaCard(
	iucnCategory: string
): { cardId: ProtectedZoneCardId; level: 'veto' | 'caution' } | null {
	switch (iucnCategory.trim().toUpperCase()) {
		case 'IA':
		case 'IB':
			return { cardId: 'rnn', level: 'veto' };
		case 'II':
			return { cardId: 'pn', level: 'veto' };
		case 'III':
		case 'IV':
			return { cardId: 'rnr_regional', level: 'caution' };
		case 'V':
		case 'VI':
			return { cardId: 'pnr', level: 'caution' };
		default:
			return null;
	}
}

function cardLabel(cardId: ProtectedZoneCardId): string {
	switch (cardId) {
		case 'pn':
			return m.veto_zone_pn();
		case 'rnn':
			return m.veto_zone_rnn();
		case 'pnr':
			return m.veto_zone_pnr();
		case 'rnr_regional':
			return m.veto_zone_rnr_regional();
		case 'natura2000':
			return m.veto_zone_natura2000();
		default:
			return cardId;
	}
}

/**
 * Live EEA scan for a single point. No caching — the caller (dispatch) is
 * responsible for memory/persistent caching and for deciding what to do on
 * failure (fall back to cache or surface the error), matching the FR flow in
 * `$lib/utils/protectedAreas`.
 */
export async function scanProtectedAreasEea(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ProtectedAreaScan> {
	throwIfAborted(options?.signal);
	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);

	try {
		const point = pointGeometryParam(latitude, longitude);

		const [natura2000Point, cddaPoint] = await Promise.all([
			queryField(NATURA2000_QUERY_URL, 'SITETYPE', point, 'esriGeometryPoint', signal),
			queryField(CDDA_QUERY_URL, 'iucnCategory', point, 'esriGeometryPoint', signal)
		]);

		const zoneStatus = emptyZoneStatus();

		if (natura2000Point.length > 0) {
			zoneStatus.natura2000 = 'certain';
		}

		for (const category of cddaPoint) {
			const mapped = cddaCard(category);
			if (mapped) zoneStatus[mapped.cardId] = 'certain';
		}

		const cddaCards: ProtectedZoneCardId[] = ['pn', 'rnn', 'pnr', 'rnr_regional'];
		const needsEnvelope = cddaCards.some((cardId) => zoneStatus[cardId] === 'clear');

		if (needsEnvelope) {
			const envelope = envelopeGeometryParam(latitude, longitude);
			const cddaBuffer = await queryField(
				CDDA_QUERY_URL,
				'iucnCategory',
				envelope,
				'esriGeometryEnvelope',
				signal
			);
			for (const category of cddaBuffer) {
				const mapped = cddaCard(category);
				if (mapped && zoneStatus[mapped.cardId] === 'clear') {
					zoneStatus[mapped.cardId] = 'potential';
				}
			}
		}

		const hits: ProtectedZoneHit[] = (
			['pn', 'rnn', 'pnr', 'rnr_regional', 'natura2000'] as ProtectedZoneCardId[]
		)
			.filter((cardId) => zoneStatus[cardId] !== 'clear')
			.map((cardId) => ({
				id: cardId,
				label: cardLabel(cardId),
				level: VETO_CARD_IDS.includes(cardId) ? ('veto' as const) : ('caution' as const)
			}));

		const veto = VETO_CARD_IDS.some((cardId) => zoneStatus[cardId] !== 'clear');

		return {
			scannedAt: new Date().toISOString(),
			hits,
			veto,
			zoneStatus,
			fromCache: false
		};
	} finally {
		dispose();
	}
}
