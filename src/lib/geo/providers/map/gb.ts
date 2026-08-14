import type { CountryMapProvider, MapLayerConfig } from './types';
import { createGbProtectedOverlayForPoint } from './eeaProtectedOverlay';

const TILE_SIZE = 256;

const OPENTOPOMAP_FALLBACK: MapLayerConfig = {
	tiles: [
		'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
		'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
		'https://c.tile.opentopomap.org/{z}/{x}/{y}.png'
	],
	tileSize: TILE_SIZE,
	attribution: 'Map data: © OpenStreetMap contributors, SRTM — Map style: © OpenTopoMap (CC-BY-SA)',
	maxZoom: 17
};

const ESRI_WORLD_IMAGERY: MapLayerConfig = {
	tiles: [
		'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
	],
	tileSize: TILE_SIZE,
	attribution: 'Esri, Maxar, Earthstar Geographics',
	maxZoom: 19
};

/**
 * `VITE_OS_API_KEY` — optional. Register a free "OS Data Hub" project key at
 * https://osdatahub.os.uk/ to unlock the OS Maps API (OS Open Zoomstack /
 * Outdoor style) raster tiles for Great Britain. Documented in `.env.example`.
 * Without a key, the plan layer falls back to OpenTopoMap so the map still
 * works for GB users who haven't configured OS access.
 */
function getOsApiKey(): string | undefined {
	const key = import.meta.env.VITE_OS_API_KEY;
	return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

// OS Maps API — ZXY raster tiles (OS OpenData tier covers low/mid zooms without a paid plan).
// https://docs.os.uk/os-apis/accessing-os-apis/os-maps-api/technical-specification/zxy
function buildOsPlanLayer(apiKey: string): MapLayerConfig {
	return {
		tiles: [`https://api.os.uk/maps/raster/v1/zxy/Outdoor_3857/{z}/{x}/{y}.png?key=${apiKey}`],
		tileSize: TILE_SIZE,
		attribution: 'Contains OS data © Crown copyright and database right',
		maxZoom: 20
	};
}

/**
 * OS OpenData has no free nationwide aerial-imagery layer either (aerial
 * imagery requires a Premium OS Maps API plan), so "ortho" always falls back
 * to Esri World Imagery. HM Land Registry's cadastre-equivalent (INSPIRE
 * Index Polygons) is a downloadable dataset, not a tile service, so no
 * cadastre overlay is offered.
 *
 * Protected overlay is nation-aware (England Defra / Scotland NatureScot /
 * Wales NRW) when coordinates are provided.
 */
export function createGbMapProvider(options?: {
	latitude?: number;
	longitude?: number;
}): CountryMapProvider {
	const apiKey = getOsApiKey();

	return {
		country: 'GB',
		plan: apiKey ? buildOsPlanLayer(apiKey) : OPENTOPOMAP_FALLBACK,
		ortho: ESRI_WORLD_IMAGERY,
		hillshade: null,
		cadastreOverlay: null,
		protectedAreasOverlay: createGbProtectedOverlayForPoint(options?.latitude, options?.longitude)
	};
}
