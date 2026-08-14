import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;

/**
 * Finland basemap: OpenTopoMap + Esri World Imagery
 * (same honesty as DK/SE when no free national commercial-friendly topo is wired).
 */
const PLAN: MapLayerConfig = {
	tiles: [
		'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
		'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
		'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
	],
	tileSize: TILE_SIZE,
	attribution: 'Map data: © OpenStreetMap contributors, SRTM — Map style: © OpenTopoMap (CC-BY-SA)',
	maxZoom: 17
};

const ORTHO: MapLayerConfig = {
	tiles: [
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: 'Esri, Maxar, Earthstar Geographics',
	maxZoom: 19
};

export function createFiMapProvider(): CountryMapProvider {
	return {
		country: 'FI',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
