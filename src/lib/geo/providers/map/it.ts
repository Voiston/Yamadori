import type { CountryMapProvider, MapLayerConfig } from './types';
import { createEeaProtectedAreasOverlay } from './eeaProtectedOverlay';

const TILE_SIZE = 256;

/**
 * Italy's national geoportal (Geoportale Nazionale / ex-PCN) and the Catasto
 * (Agenzia delle Entrate, https://wms.cartografia.agenziaentrate.gov.it) only
 * publish on-demand WMS endpoints for topo/ortho/cadastre — no public
 * XYZ/WMTS tiled service with stable {z}/{x}/{y} tiles is documented for
 * nationwide coverage. Per project policy `tile.openstreetmap.org` itself is
 * forbidden, so this provider falls back to commercial-friendly, properly
 * attributed public tile sets instead of the raw OSM tile server:
 *  - plan: OpenTopoMap (CC-BY-SA, attribution required, reasonable-use tile policy)
 *  - ortho: Esri World Imagery (attribution required, free for this kind of use)
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

/** No national hillshade/cadastre XYZ tile service is available for Italy (see module docs above). */
export function createItMapProvider(): CountryMapProvider {
	return {
		country: 'IT',
		plan: PLAN,
		ortho: ORTHO,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createEeaProtectedAreasOverlay()
	};
}
