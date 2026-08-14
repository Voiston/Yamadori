import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const BASEMAPDE_ATTRIBUTION = '© GeoBasis-DE / BKG — CC BY 4.0';

// basemap.de Web Raster (colour), GLOBAL_WEBMERCATOR tile matrix set — official BKG/AdV service.
// https://gdz.bkg.bund.de/index.php/default/webdienste/basemap-webdienste/wmts-basemapde-webraster-wmts-basemapde-webraster.html
// Note the path segment order is .../{z}/{y}/{x}.png (row before column) — verified against BKG docs.
const PLAN: MapLayerConfig = {
	tiles: [
		'https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_farbe/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png'
	],
	tileSize: TILE_SIZE,
	attribution: BASEMAPDE_ATTRIBUTION,
	maxZoom: 19
};

/**
 * Germany has no unified, free, nationwide aerial-imagery WMTS: digital
 * orthophotos (DOP) are published per-Bundesland (state) under differing
 * licenses/endpoints. Esri World Imagery is used as a pragmatic, properly
 * attributed nationwide fallback for the "ortho" basemap.
 */
const ORTHO: MapLayerConfig = {
	tiles: [
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: 'Esri, Maxar, Earthstar Geographics',
	maxZoom: 19
};

/**
 * No unified nationwide hillshade WMTS or cadastre (ALKIS) tile service is
 * free/public for all of Germany (ALKIS is state-managed and mostly
 * commercial), so both are left unavailable rather than approximated.
 */
export function createDeMapProvider(): CountryMapProvider {
	return {
		country: 'DE',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
