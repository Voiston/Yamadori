import type { MapLayerConfig } from '$lib/geo/providers/map/types';

const TILE_SIZE = 256;

/**
 * ArcGIS REST MapServer tiles (Web Mercator).
 * Path is `{z}/{y}/{x}` (level / row / col) — same convention as EEA Discomap.
 */
export function createArcGisMapServerOverlay(
	mapServerBaseUrl: string,
	attribution: string,
	maxZoom = 16
): MapLayerConfig {
	const base = mapServerBaseUrl.replace(/\/+$/, '').replace(/\/tile$/i, '');
	return {
		tiles: [`${base}/tile/{z}/{y}/{x}`],
		tileSize: TILE_SIZE,
		attribution,
		maxZoom
	};
}

/**
 * Dynamic ArcGIS MapServer export as MapLibre raster tiles.
 * Used when the service has no fused tile cache (PAD-US, CPCAD, …).
 * `{bbox-epsg-3857}` is substituted by MapLibre per tile.
 */
export function createArcGisExportOverlay(
	mapServerBaseUrl: string,
	attribution: string,
	options?: { layers?: string; maxZoom?: number }
): MapLayerConfig {
	const base = mapServerBaseUrl.replace(/\/+$/, '');
	const layers = options?.layers ?? 'show:0';
	const params = new URLSearchParams({
		bboxSR: '3857',
		imageSR: '3857',
		size: '256,256',
		format: 'png32',
		transparent: 'true',
		f: 'image',
		layers
	});
	// bbox must stay a template placeholder — append after URLSearchParams.
	return {
		tiles: [`${base}/export?bbox={bbox-epsg-3857}&${params.toString()}`],
		tileSize: TILE_SIZE,
		attribution,
		maxZoom: options?.maxZoom ?? 14
	};
}

/**
 * OGC WMS 1.1.1 GetMap as MapLibre raster tiles (EPSG:3857 bbox).
 */
export function createWmsBboxOverlay(
	wmsGetMapBaseUrl: string,
	layers: string,
	attribution: string,
	maxZoom = 14
): MapLayerConfig {
	const sep = wmsGetMapBaseUrl.includes('?') ? '&' : '?';
	const params = new URLSearchParams({
		SERVICE: 'WMS',
		VERSION: '1.1.1',
		REQUEST: 'GetMap',
		LAYERS: layers,
		STYLES: '',
		FORMAT: 'image/png',
		TRANSPARENT: 'true',
		SRS: 'EPSG:3857',
		WIDTH: '256',
		HEIGHT: '256'
	});
	return {
		tiles: [`${wmsGetMapBaseUrl}${sep}${params.toString()}&BBOX={bbox-epsg-3857}`],
		tileSize: TILE_SIZE,
		attribution,
		maxZoom
	};
}

/**
 * EEA Discomap Natura 2000 — dynamic export (no fused XYZ tile cache on this MapServer).
 * Same service as point queries in `$lib/geo/providers/protected/eea.ts`.
 */
const NATURA2000_MAP_SERVER =
	'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer';

const EEA_ATTRIBUTION = '© EEA — Natura 2000 (Discomap)';

/** Shared protected-areas raster overlay for EEA countries (verification toggle, not discovery). */
export function createEeaProtectedAreasOverlay(): MapLayerConfig {
	return createArcGisExportOverlay(NATURA2000_MAP_SERVER, EEA_ATTRIBUTION, {
		layers: 'show:0',
		maxZoom: 14
	});
}

/**
 * Swiss federal WMTS — national parks / parks of national importance (BAFU).
 * https://www.geo.admin.ch/en/wmts-available-services-and-data
 */
export function createChProtectedAreasOverlay(): MapLayerConfig {
	return {
		tiles: [
			'https://wmts.geo.admin.ch/1.0.0/ch.bafu.schutzgebiete-paerke_nationaler_bedeutung/default/current/3857/{z}/{x}/{y}.png'
		],
		tileSize: TILE_SIZE,
		attribution: '© BAFU / swisstopo — Schutzgebiete',
		maxZoom: 18
	};
}

/** PAD-US Fee Managers footprint — public land tenure verification overlay. */
export function createUsPadusOverlay(): MapLayerConfig {
	return createArcGisExportOverlay(
		'https://edits.nationalmap.gov/arcgis/rest/services/PAD-US/PAD_US/MapServer',
		'© USGS — PAD-US',
		{ layers: 'show:0', maxZoom: 14 }
	);
}

/** CPCAD — Canadian protected & conserved areas overlay. */
export function createCaCpcadOverlay(): MapLayerConfig {
	return createArcGisExportOverlay(
		'https://maps-cartes.ec.gc.ca/arcgis/rest/services/CWS_SCF/CPCAD/MapServer',
		'© ECCC — CPCAD',
		{ layers: 'show:0', maxZoom: 14 }
	);
}

/** DOC Public Conservation Areas (NaPALIS) overlay. */
export function createNzDocPclOverlay(): MapLayerConfig {
	return createArcGisExportOverlay(
		'https://mapserver.doc.govt.nz/arcgis/rest/services/Vector/PublicConservationAreas/MapServer',
		'© DOC — Public Conservation Areas',
		{ layers: 'show:0', maxZoom: 14 }
	);
}

/**
 * Natural England SSSI (England) — Defra WMS.
 * GB overlay is nation-specific; Scotland/Wales use NatureScot / NRW WMS.
 */
export function createGbEnglandProtectedOverlay(): MapLayerConfig {
	return createWmsBboxOverlay(
		'https://environment.data.gov.uk/spatialdata/sites-of-special-scientific-interest-units-england/wms',
		'Sites_of_Special_Scientific_Interest_Units_England',
		'© Natural England / Defra — SSSI (OGL)',
		14
	);
}

/** NatureScot SSSI (Scotland). */
export function createGbScotlandProtectedOverlay(): MapLayerConfig {
	return createWmsBboxOverlay(
		'https://ogc.nature.scot/geoserver/protectedareas/wms',
		'protectedareas:sssi',
		'© NatureScot — SSSI',
		14
	);
}

/** NRW SSSI (Wales) via DataMapWales. */
export function createGbWalesProtectedOverlay(): MapLayerConfig {
	return createWmsBboxOverlay(
		'https://datamap.gov.wales/geoserver/ows',
		'inspire-nrw:NRW_SSSI',
		'© Natural Resources Wales — SSSI',
		14
	);
}

/**
 * Northern Ireland — no public ASSI XYZ/WMS tile cache; use EEA Natura 2000
 * (SAC/SPA) as verification overlay. ASSI boundaries are covered by the
 * NIEA point scan.
 */
export function createGbNiProtectedOverlay(): MapLayerConfig {
	return createArcGisExportOverlay(
		'https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000Sites/MapServer',
		'© EEA Natura 2000 / NIEA — NI (ASSI via point scan)',
		{ layers: 'show:0', maxZoom: 14 }
	);
}

/**
 * Pick England / Scotland / Wales / NI protected overlay from coordinates.
 */
export function createGbProtectedOverlayForPoint(
	latitude?: number,
	longitude?: number
): MapLayerConfig {
	if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return createGbEnglandProtectedOverlay();
	}
	// Inline bbox checks to avoid coupling map helpers to the protected scan module.
	const inNi =
		latitude >= 54.0 && latitude <= 55.4 && longitude >= -8.3 && longitude <= -5.35;
	if (inNi) return createGbNiProtectedOverlay();

	const inWales =
		latitude >= 51.25 && latitude <= 53.5 && longitude >= -5.5 && longitude <= -2.65;
	const inScotland =
		latitude >= 54.6 &&
		latitude <= 60.9 &&
		longitude >= -8.7 &&
		longitude <= -0.7 &&
		(latitude >= 55.0 || longitude <= -4.0);

	if (inScotland) return createGbScotlandProtectedOverlay();
	if (inWales) return createGbWalesProtectedOverlay();
	return createGbEnglandProtectedOverlay();
}
