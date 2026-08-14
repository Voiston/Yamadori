import type { CountryMapProvider, MapLayerConfig } from './types';

const TILE_SIZE = 256;

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

/**
 * Generic worldwide fallback (OpenTopoMap + Esri World Imagery) used when a
 * GPS position cannot be resolved to one of the explicitly supported
 * countries, so the map still renders usable tiles outside FR/ES/IT/DE/GB/CH/AT/BE/NL/SE/NO/US/CA/NZ/PT.
 */
export function createInternationalMapProvider(): CountryMapProvider {
	return {
		country: 'INTL',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null
	};
}
