import type { CadastreInfo } from '$lib/types/cadastre';
import { COUNTRY_BBOXES, pointInBbox } from '$lib/geo/countries';
import { collectStatusForZone } from '$lib/geo/legal/usCollectStatus';
import { createTimedAbortSignal, isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { nominatimReverseRaw } from '$lib/utils/geocoding';

const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Yamadori/0.6.4 (bonsai field app)';

/** Open ALKIS WFS endpoints (no owner data) — partial DE coverage. */
export type AlkisLandConfig = {
	/** ISO 3166-2 without DE- prefix, or Nominatim state match tokens. */
	match: RegExp;
	endpoint: string;
	typeName: string;
	/** Attribute keys tried for parcel id / commune. */
	parcelKeys: string[];
	communeKeys: string[];
	/**
	 * WFS 2 BBOX axis for EPSG:4326. NRW expects lat,lon; most Länder lon,lat.
	 * `both` tries lonlat then latlon.
	 */
	bboxAxis?: 'lonlat' | 'latlon' | 'both';
};

/**
 * Public open-data ALKIS WFS (no owner). BB/SH/NI/TH/HE probed 2026-07 — not wired
 * (caps/GetFeature failed). SN caps OK but BBOX/FILTER point-query 400 — not wired.
 * Expand only after live smoke.
 */
export const OPEN_ALKIS_LANDS: AlkisLandConfig[] = [
	{
		match: /berlin|DE-BE/i,
		endpoint: 'https://gdi.berlin.de/services/wfs/alkis_flurstuecke',
		typeName: 'flurstuecke',
		parcelKeys: ['fsko', 'flurstueckskennzeichen', 'flstkennz', 'id'],
		communeKeys: ['gemarkung', 'gemeinde', 'bezirk', 'name']
	},
	{
		match: /mecklenburg|vorpommern|DE-MV/i,
		endpoint: 'https://www.geodaten-mv.de/dienste/alkis_wfs_sf',
		typeName: 'ave:Flurstueck',
		parcelKeys: ['flstkennz', 'flurstueckskennzeichen', 'id'],
		communeKeys: ['gemarkung', 'gemeinde', 'name']
	},
	{
		match: /sachsen-anhalt|DE-ST/i,
		endpoint:
			'https://www.geodatenportal.sachsen-anhalt.de/wss/service/ST_LVermGeo_ALKIS_WFS_OpenData/guest',
		typeName: 'ave:Flurstueck',
		parcelKeys: ['flstkennz', 'flurstueckskennzeichen', 'id'],
		communeKeys: ['gemarkung', 'gemeinde', 'name']
	},
	{
		match: /hamburg|DE-HH/i,
		endpoint: 'https://geodienste.hamburg.de/WFS_HH_ALKIS_vereinfacht',
		typeName: 'ave:Flurstueck',
		parcelKeys: [
			'flurstueckskennzeichen',
			'flstkennz',
			'kennzeichen',
			'label',
			'id',
			'objektid'
		],
		communeKeys: ['gemarkung', 'gemeinde', 'bezirk', 'name', 'ortsteil']
	},
	{
		match: /bremen|bremerhaven|DE-HB/i,
		endpoint: 'https://geodienste.bremen.de/wfs_hduk2958loah3976niun',
		typeName: 'app:flurstuecke',
		parcelKeys: ['flstkennz', 'flurstueckskennzeichen', 'kennzeichen', 'id', 'name'],
		communeKeys: ['gemarkung', 'gemeinde', 'name', 'stadt']
	},
	{
		match: /nordrhein|westfalen|DE-NW/i,
		endpoint: 'https://www.wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht',
		typeName: 'ave:Flurstueck',
		parcelKeys: ['flstkennz', 'flurstueckskennzeichen', 'idflurst', 'oid', 'id'],
		communeKeys: ['gemeinde', 'gemarkung', 'kreis', 'name'],
		/** Geobasis NRW interprets EPSG:4326 BBOX as lat,lon. */
		bboxAxis: 'latlon'
	},
	{
		match: /baden|w(?:ue|ü)rttemberg|DE-BW/i,
		endpoint: 'https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_LGL-BW_ALKIS',
		typeName: 'nora:v_al_flurstueck',
		parcelKeys: [
			'flurstueckskennzeichen',
			'flurstueckstext',
			'zaehler',
			'id',
			'gml_id'
		],
		communeKeys: ['gemeinde_name', 'gemarkung_name', 'gemeinde', 'gemarkung', 'name']
	},
	{
		match: /rheinland[- ]?pfalz|DE-RP|\bRLP\b/i,
		endpoint: 'https://geo5.service24.rlp.de/wfs/alkis_rp.fcgi',
		typeName: 'ave:Flurstueck',
		parcelKeys: ['flstkennz', 'flurstueckskennzeichen', 'idflurst', 'oid', 'id'],
		communeKeys: ['gemeinde', 'gemarkung', 'kreis', 'name'],
		/** LVermGeo RP interprets EPSG:4326 BBOX as lat,lon (smoke Mainz 2026-07). */
		bboxAxis: 'latlon'
	}
];

export function isInGermanyCadastreCoverage(latitude: number, longitude: number): boolean {
	return pointInBbox(latitude, longitude, COUNTRY_BBOXES.DE);
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

function stateLabelFromAddress(address: {
	state?: string;
	'ISO3166-2-lvl4'?: string;
}): string {
	const iso = address['ISO3166-2-lvl4'] ?? '';
	const state = address.state ?? '';
	return `${iso} ${state}`.trim();
}

async function resolveGermanState(
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<string> {
	// Prefer shared zoom-14 reverse; zoom 8 only if state / ISO3166 is missing.
	const at14 = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 14 });
	const from14 = at14?.address ? stateLabelFromAddress(at14.address) : '';
	if (from14) return from14;

	const at8 = await nominatimReverseRaw(latitude, longitude, { signal, zoom: 8 });
	if (!at8?.address) return '';
	return stateLabelFromAddress(at8.address);
}

/** Match Nominatim state / ISO3166-2 label to an open ALKIS Land config. */
export function landForState(stateLabel: string): AlkisLandConfig | null {
	if (!stateLabel) return null;
	return OPEN_ALKIS_LANDS.find((land) => land.match.test(stateLabel)) ?? null;
}

function buildBboxFilter(longitude: number, latitude: number): string {
	const d = 0.00015;
	const minx = longitude - d;
	const miny = latitude - d;
	const maxx = longitude + d;
	const maxy = latitude + d;
	return `<Filter xmlns="http://www.opengis.net/ogc"><BBOX><PropertyName>geom</PropertyName><gml:Box xmlns:gml="http://www.opengis.net/gml" srsName="EPSG:4326"><gml:coordinates>${minx},${miny} ${maxx},${maxy}</gml:coordinates></gml:Box></BBOX></Filter>`;
}

function bboxVariants(
	land: AlkisLandConfig,
	latitude: number,
	longitude: number
): string[] {
	const d = 0.00015;
	const lonlat = `${longitude - d},${latitude - d},${longitude + d},${latitude + d},EPSG:4326`;
	const latlon = `${latitude - d},${longitude - d},${latitude + d},${longitude + d},EPSG:4326`;
	const axis = land.bboxAxis ?? 'both';
	if (axis === 'latlon') return [latlon];
	if (axis === 'lonlat') return [lonlat];
	return [lonlat, latlon];
}

function cadastreFromAttrs(
	attrs: Record<string, unknown>,
	land: AlkisLandConfig
): CadastreInfo | null {
	const parcel = pickAttr(attrs, land.parcelKeys);
	const commune = pickAttr(attrs, land.communeKeys);
	if (!parcel && !commune) return null;
	return {
		commune: commune || 'Deutschland',
		section: parcel.slice(0, 8) || '—',
		parcelNumber: parcel || '—',
		codeInsee: parcel,
		zoneType: 'private',
		fetchedAt: new Date().toISOString(),
		collectStatus: collectStatusForZone('private')
	};
}

/** Parse GeoJSON FeatureCollection from an ALKIS WFS GetFeature body. */
export function parseAlkisGeoJson(data: unknown, land: AlkisLandConfig): CadastreInfo | null {
	const collection = data as {
		features?: Array<{ properties?: Record<string, unknown> }>;
	};
	const feature = collection.features?.[0];
	if (!feature?.properties) return null;
	return cadastreFromAttrs(feature.properties, land);
}

/**
 * Minimal GML/XML property scrape for WFS that do not expose GeoJSON (e.g. NRW).
 * Ignores geometry blocks; reads first wfs:member / Flurstueck simple children.
 */
export function parseAlkisGml(text: string, land: AlkisLandConfig): CadastreInfo | null {
	const member =
		text.match(/<(?:wfs:)?member\b[^>]*>([\s\S]*?)<\/(?:wfs:)?member>/i)?.[1] ??
		text.match(/<(?:ave:)?Flurstueck\b[^>]*>([\s\S]*?)<\/(?:ave:)?Flurstueck>/i)?.[1];
	if (!member) return null;

	const stripped = member
		.replace(
			/<(?:[\w-]+:)?(?:geometrie|geometry|MultiSurface|Polygon|posList|exterior|interior|surfaceMember|boundedBy|Envelope)\b[\s\S]*?<\/(?:[\w-]+:)?(?:geometrie|geometry|MultiSurface|Polygon|posList|exterior|interior|surfaceMember|boundedBy|Envelope)>/gi,
			''
		)
		.replace(/<(?:[\w-]+:)?(?:lowerCorner|upperCorner|identifier)\b[^>]*>[\s\S]*?<\/(?:[\w-]+:)?(?:lowerCorner|upperCorner|identifier)>/gi, '');

	const attrs: Record<string, unknown> = {};
	const tagRe =
		/<(?:[\w-]+:)?([A-Za-z_][\w.-]*)(?:\s[^>]*)?>([^<]*)<\/(?:[\w-]+:)?\1>/g;
	let match: RegExpExecArray | null;
	while ((match = tagRe.exec(stripped)) !== null) {
		const key = match[1];
		const value = match[2].trim();
		if (!value) continue;
		if (!attrs[key]) attrs[key] = value;
	}
	return cadastreFromAttrs(attrs, land);
}

/** Dispatch GeoJSON or GML GetFeature body → CadastreInfo. */
export function parseAlkisWfsResponse(text: string, land: AlkisLandConfig): CadastreInfo | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('{')) {
		try {
			return parseAlkisGeoJson(JSON.parse(trimmed) as unknown, land);
		} catch {
			return null;
		}
	}
	if (trimmed.includes('FeatureCollection') || trimmed.includes('Flurstueck')) {
		return parseAlkisGml(trimmed, land);
	}
	return null;
}

const JSON_FORMATS = [
	'application/geo+json',
	'application/json',
	'application/json; subtype=geojson'
] as const;

async function queryAlkisWfs(
	land: AlkisLandConfig,
	latitude: number,
	longitude: number,
	signal: AbortSignal
): Promise<CadastreInfo | null> {
	const headers = { 'User-Agent': USER_AGENT, Accept: '*/*' };
	const bboxes = bboxVariants(land, latitude, longitude);

	for (const bbox of bboxes) {
		for (const outputFormat of [...JSON_FORMATS, null] as const) {
			const bboxParams = new URLSearchParams({
				SERVICE: 'WFS',
				VERSION: '2.0.0',
				REQUEST: 'GetFeature',
				TYPENAMES: land.typeName,
				SRSNAME: 'EPSG:4326',
				BBOX: bbox,
				COUNT: '1'
			});
			if (outputFormat) bboxParams.set('OUTPUTFORMAT', outputFormat);
			try {
				const response = await fetch(`${land.endpoint}?${bboxParams}`, { signal, headers });
				if (!response.ok) continue;
				const text = await response.text();
				const parsed = parseAlkisWfsResponse(text, land);
				if (parsed) return parsed;
			} catch {
				/* try next format / axis */
			}
		}
	}

	const filterParams = new URLSearchParams({
		SERVICE: 'WFS',
		VERSION: '1.1.0',
		REQUEST: 'GetFeature',
		TYPENAME: land.typeName,
		OUTPUTFORMAT: 'application/json',
		SRSNAME: 'EPSG:4326',
		FILTER: buildBboxFilter(longitude, latitude)
	});
	try {
		const response = await fetch(`${land.endpoint}?${filterParams}`, { signal, headers });
		if (!response.ok) return null;
		return parseAlkisWfsResponse(await response.text(), land);
	} catch {
		return null;
	}
}

/**
 * ALKIS open-data lookup for a subset of Länder (BE, MV, ST, HH, HB, NRW, BW, RP).
 * Other Länder return null — coverage is partial by design.
 */
export async function lookupCadastreDe(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<CadastreInfo | null> {
	throwIfAborted(options?.signal);
	if (!isInGermanyCadastreCoverage(latitude, longitude)) {
		return null;
	}

	const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);
	try {
		const stateLabel = await resolveGermanState(latitude, longitude, signal);
		const land = landForState(stateLabel);
		if (!land) return null;
		return await queryAlkisWfs(land, latitude, longitude, signal);
	} catch (error) {
		if (isAbortError(error)) throw error;
		return null;
	} finally {
		dispose();
	}
}

export function isInGermanyCoverage(latitude: number, longitude: number): boolean {
	return isInGermanyCadastreCoverage(latitude, longitude);
}
