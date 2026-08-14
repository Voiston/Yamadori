import type { Map as MaplibreMap, RasterTileSource } from 'maplibre-gl';
import type { CountryCode } from '$lib/geo/countries';
import { getMapProvider, type MapProviderLocation } from './registry';
import type { BasemapLayerId, CountryMapProvider, MapLayerConfig } from './types';

/** Source ids used by `createMapStyle` — kept stable across countries to minimize TopoMap.svelte churn. */
const BASEMAP_SOURCE_IDS: Record<BasemapLayerId, string> = {
	plan: 'ign-plan',
	ortho: 'ign-ortho',
	hillshade: 'ign-hillshade'
};
const CADASTRE_SOURCE_ID = 'ign-cadastre';
const PROTECTED_SOURCE_ID = 'ign-protected';

// Same 1x1 transparent GIF as `styles.ts` — placeholder when a country has no overlay.
const UNAVAILABLE_TILE_URL =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

function unavailableLayerConfig(attribution: string): MapLayerConfig {
	return { tiles: [UNAVAILABLE_TILE_URL], tileSize: 256, attribution, maxZoom: 19 };
}

function swapTiles(map: MaplibreMap, sourceId: string, layer: MapLayerConfig | null | undefined): boolean {
	if (!layer) {
		return false;
	}

	const source = map.getSource(sourceId) as RasterTileSource | undefined;
	if (!source || typeof source.setTiles !== 'function') {
		return false;
	}

	source.setTiles(layer.tiles);
	return true;
}

/**
 * Switches basemap / overlay tile URLs in place via `RasterTileSource.setTiles()`,
 * avoiding a full `map.setStyle()` reload (which re-downloads every tile source).
 *
 * Prefer this on pan / country-flip. Reserve `map.setStyle(createMapStyle(...))`
 * for initial map creation or rare full style rebuilds.
 *
 * Note: `setTiles()` does not update attribution, tileSize, or maxzoom baked into
 * the style at creation time — acceptable for mid-session border crossings.
 *
 * Pass `location` for nation-aware overlays (e.g. GB England vs Scotland).
 */
export function applyCountryBasemap(
	map: MaplibreMap,
	country: CountryCode | null,
	location?: MapProviderLocation
): CountryMapProvider {
	const provider = getMapProvider(country, location);
	const fallback = unavailableLayerConfig(provider.plan.attribution);

	for (const layerId of Object.keys(BASEMAP_SOURCE_IDS) as BasemapLayerId[]) {
		swapTiles(map, BASEMAP_SOURCE_IDS[layerId], provider[layerId] ?? fallback);
	}
	swapTiles(map, CADASTRE_SOURCE_ID, provider.cadastreOverlay ?? fallback);
	swapTiles(map, PROTECTED_SOURCE_ID, provider.protectedAreasOverlay ?? fallback);

	return provider;
}
