import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const BASEMAP_AT_ATTRIBUTION = '© basemap.at — CC BY 4.0';

/**
 * Official Austrian open basemap (WebMercator / google3857 tile matrix).
 * https://basemap.at/ — CC-BY 4.0, free commercial use.
 * Note tile path order: {z}/{y}/{x} (row before column).
 */
const PLAN: MapLayerConfig = {
	tiles: [
		'https://mapsneu.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
		'https://maps1.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
		'https://maps2.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
		'https://maps3.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png',
		'https://maps4.wien.gv.at/basemap/geolandbasemap/normal/google3857/{z}/{y}/{x}.png'
	],
	tileSize: TILE_SIZE,
	attribution: BASEMAP_AT_ATTRIBUTION,
	maxZoom: 19
};

const ORTHO: MapLayerConfig = {
	tiles: [
		'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
		'https://maps1.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
		'https://maps2.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
		'https://maps3.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg',
		'https://maps4.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg'
	],
	tileSize: TILE_SIZE,
	attribution: BASEMAP_AT_ATTRIBUTION,
	maxZoom: 20
};

export function createAtMapProvider(): CountryMapProvider {
	return {
		country: 'AT',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
