import type { CountryMapProvider, MapLayerConfig } from './types';
import {
	createEeaProtectedAreasOverlay,
	createWmsBboxOverlay
} from './eeaProtectedOverlay';

const TILE_SIZE = 256;
const IGN_ES_ATTRIBUTION = '© Instituto Geográfico Nacional de España — CC BY 4.0 scne.es';
const CATASTRO_WMS =
	'https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx';
const CATASTRO_ATTRIBUTION = '© Dirección General del Catastro (España)';

// IGNBase "Todo" WMTS (topographic base map), GoogleMapsCompatible tile matrix set.
// https://github.com/IGN-CNIG/API-CNIG/wiki/WMTS ; https://ropenspain.github.io/mapSpain/reference/esp_tiles_providers.html
const PLAN: MapLayerConfig = {
	tiles: [
		'https://www.ign.es/wmts/ign-base?service=WMTS&request=GetTile&version=1.0.0&layer=IGNBaseTodo&style=default&format=image/png&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}'
	],
	tileSize: TILE_SIZE,
	attribution: `${IGN_ES_ATTRIBUTION} — IGNBase`,
	maxZoom: 19
};

// PNOA "máxima actualidad" orthophoto WMTS.
// https://pnt.ign.es/visualizadores-y-servicios-web
const ORTHO: MapLayerConfig = {
	tiles: [
		'https://www.ign.es/wmts/pnoa-ma?service=WMTS&request=GetTile&version=1.0.0&layer=OI.OrthoimageCoverage&style=default&format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}'
	],
	tileSize: TILE_SIZE,
	attribution: `${IGN_ES_ATTRIBUTION} — PNOA`,
	maxZoom: 19
};

// MDT (Modelo Digital del Terreno) "Relieve" layer — pre-rendered hillshade tiles.
// https://datos.gob.es/eu/catalogo/e0dat0002-wmts-del-modelo-digital-de-terreno-de-espana
const HILLSHADE: MapLayerConfig = {
	tiles: [
		'https://servicios.idee.es/wmts/mdt?service=WMTS&request=GetTile&version=1.0.0&layer=Relieve&style=default&format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}'
	],
	tileSize: TILE_SIZE,
	attribution: `${IGN_ES_ATTRIBUTION} — MDT`,
	maxZoom: 16
};

/**
 * Catastro WMS (on-demand GetMap via BBOX) — no public XYZ/WMTS.
 * Layer `PARCELA` from GetCapabilities; daily-updated parcels.
 * https://www.catastro.hacienda.gob.es/es-ES/wms.html
 */
const CADASTRE = createWmsBboxOverlay(CATASTRO_WMS, 'PARCELA', CATASTRO_ATTRIBUTION, 18);

export function createEsMapProvider(): CountryMapProvider {
	return {
		country: 'ES',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: HILLSHADE,
		cadastreOverlay: CADASTRE,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
