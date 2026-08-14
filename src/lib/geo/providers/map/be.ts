import type { CountryMapProvider, MapLayerConfig } from './types';
import {
	createArcGisExportOverlay,
	createEeaProtectedAreasOverlay
} from './eeaProtectedOverlay';

const TILE_SIZE = 256;

/**
 * Belgium has no free nationwide WebMercator topo suitable for a commercial
 * app: NGI CartoWeb is CC-BY-NC (registration/royalties for commercial use).
 * Regional services (Flanders GRB, Brussels UrbIS) leave Wallonia gaps.
 * OpenTopoMap + Esri ortho matches the international fallback — honest and
 * licence-safe for Pro.
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

/** CadGIS INSPIRE Cadastral Parcels — same MapServer as parcel identify (no owner). */
const CADGIS_CP_MAP_SERVER =
	'https://ccff02.minfin.fgov.be/geoservices/arcgis/rest/services/INSPIRE/CP/MapServer';

const CADASTRE = createArcGisExportOverlay(CADGIS_CP_MAP_SERVER, '© SPF Finances — CadGIS', {
	layers: 'show:0',
	maxZoom: 18
});

export function createBeMapProvider(): CountryMapProvider {
	return {
		country: 'BE',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: CADASTRE,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
