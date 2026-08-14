import type { CountryMapProvider, MapLayerConfig } from './types';
import { createChProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const SWISSTOPO_ATTRIBUTION = '© swisstopo';

/**
 * Federal WMTS (EPSG:3857) — free under FSDI terms with attribution.
 * https://www.geo.admin.ch/en/wmts-available-services-and-data
 */
const PLAN: MapLayerConfig = {
	tiles: [
		'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg'
	],
	tileSize: TILE_SIZE,
	attribution: SWISSTOPO_ATTRIBUTION,
	maxZoom: 18
};

const ORTHO: MapLayerConfig = {
	tiles: [
		'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg'
	],
	tileSize: TILE_SIZE,
	attribution: SWISSTOPO_ATTRIBUTION,
	maxZoom: 19
};

export function createChMapProvider(): CountryMapProvider {
	return {
		country: 'CH',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createChProtectedAreasOverlay()
	};
}
