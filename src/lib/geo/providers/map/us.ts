import type { CountryMapProvider, MapLayerConfig } from './types';
import { createUsPadusOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;

/**
 * USA basemap: USGS Topo via The National Map (public) + Esri World Imagery.
 * Public-land tenure overlay (PAD-US) is verification-only — not a private cadastre.
 */
const PLAN: MapLayerConfig = {
	tiles: [
		'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: '© USGS — The National Map',
	maxZoom: 16
};

const ORTHO: MapLayerConfig = {
	tiles: [
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: 'Esri, Maxar, Earthstar Geographics',
	maxZoom: 19
};

export function createUsMapProvider(): CountryMapProvider {
	return {
		country: 'US',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createUsPadusOverlay()
	};
}
