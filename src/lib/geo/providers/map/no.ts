import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const KARTVERKET_ATTRIBUTION = '© Kartverket — CC BY 4.0';

/**
 * Kartverket topo cache WMTS (WebMercator). Path order is z/y/x (row before col).
 * https://cache.kartverket.no/
 */
const PLAN: MapLayerConfig = {
	tiles: ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'],
	tileSize: TILE_SIZE,
	attribution: KARTVERKET_ATTRIBUTION,
	maxZoom: 18
};

const ORTHO: MapLayerConfig = {
	tiles: [
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: 'Esri, Maxar, Earthstar Geographics',
	maxZoom: 19
};

export function createNoMapProvider(): CountryMapProvider {
	return {
		country: 'NO',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
