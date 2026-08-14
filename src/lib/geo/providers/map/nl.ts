import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const PDOK_ATTRIBUTION = '© Kadaster / PDOK — CC BY 4.0';

/**
 * PDOK BRT Achtergrondkaart (standaard) — nationwide WebMercator WMTS, CC-BY 4.0
 * commercial-friendly (unlike NGI CartoWeb BE).
 * https://www.pdok.nl/ogc-webservices/-/article/basisregistratie-topografie-achtergrondkaarten-brt-a-
 */
const PLAN: MapLayerConfig = {
	tiles: [
		'https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png'
	],
	tileSize: TILE_SIZE,
	attribution: PDOK_ATTRIBUTION,
	maxZoom: 19
};

/**
 * PDOK luchtfoto RGB (Actueel_ortho25) — CC-BY / open via PDOK.
 */
const ORTHO: MapLayerConfig = {
	tiles: [
		'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'
	],
	tileSize: TILE_SIZE,
	attribution: PDOK_ATTRIBUTION,
	maxZoom: 19
};

/**
 * Kadastrale kaart v5 — parcel boundaries (Web Mercator).
 * https://service.pdok.nl/kadaster/kadastralekaart/wmts/v5_0
 */
const CADASTRE: MapLayerConfig = {
	tiles: [
		'https://service.pdok.nl/kadaster/brk-kadastralekaart/wmts/v5_0/Kadastralekaart/EPSG:3857/{z}/{x}/{y}.png'
	],
	tileSize: TILE_SIZE,
	attribution: '© Kadaster / PDOK — Kadastrale kaart',
	maxZoom: 18
};

export function createNlMapProvider(): CountryMapProvider {
	return {
		country: 'NL',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: CADASTRE,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
