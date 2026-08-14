import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;

/**
 * Sweden: Lantmäteriet topo requires a free account/token — not wired in v1.
 * OpenTopoMap + Esri ortho (same honesty as BE).
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

export function createSeMapProvider(): CountryMapProvider {
	return {
		country: 'SE',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
