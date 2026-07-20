import type { RasterSourceSpecification, StyleSpecification } from 'maplibre-gl';
import type { CountryCode } from '$lib/geo/countries';
import { getMapProvider, type MapProviderLocation } from '$lib/geo/providers/map/registry';
import type { MapLayerConfig } from '$lib/geo/providers/map/types';

export type MapBasemap = 'topo' | 'satellite';

// 1x1 transparent GIF — placeholder source for layers a country provider doesn't offer
// (hillshade/cadastre), so the style always has a valid source for every layer id below.
const UNAVAILABLE_TILE_URL =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

function unavailableLayerConfig(attribution: string): MapLayerConfig {
	return { tiles: [UNAVAILABLE_TILE_URL], tileSize: 256, attribution, maxZoom: 19 };
}

function rasterSource(layer: MapLayerConfig): RasterSourceSpecification {
	return {
		type: 'raster',
		tiles: layer.tiles,
		tileSize: layer.tileSize ?? 256,
		attribution: layer.attribution,
		maxzoom: layer.maxZoom,
		...(layer.scheme ? { scheme: layer.scheme } : {})
	};
}

/**
 * Builds the MapLibre style for a given country's tile provider (see
 * `$lib/geo/providers/map/registry`). `country` defaults to the
 * international (OpenTopoMap + Esri) fallback when omitted/null, so the map
 * still works outside FR. Layer/source ids are kept stable (`ign-plan`,
 * `ign-plan-layer`, etc.) across all countries to avoid churn in TopoMap.svelte.
 *
 * Pass `location` so GB (and future nation-aware overlays) can pick the right
 * protected-areas tiles for the map center.
 */
export function createMapStyle(
	country?: CountryCode | null,
	location?: MapProviderLocation
): StyleSpecification {
	const provider = getMapProvider(country ?? null, location);
	const hillshade = provider.hillshade ?? unavailableLayerConfig(provider.plan.attribution);
	const cadastre = provider.cadastreOverlay ?? unavailableLayerConfig(provider.plan.attribution);
	const protectedAreas =
		provider.protectedAreasOverlay ?? unavailableLayerConfig(provider.plan.attribution);

	return {
		version: 8,
		sources: {
			'ign-plan': rasterSource(provider.plan),
			'ign-ortho': rasterSource(provider.ortho),
			'ign-hillshade': rasterSource(hillshade),
			'ign-cadastre': rasterSource(cadastre),
			'ign-protected': rasterSource(protectedAreas),
			approach: {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			},
			'parking-approach': {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			},
			'accuracy-circles': {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			},
			'sight-line': {
				type: 'geojson',
				data: { type: 'FeatureCollection', features: [] }
			}
		},
		layers: [
			{
				id: 'background',
				type: 'background',
				paint: { 'background-color': '#e8ebe4' }
			},
			{
				id: 'ign-plan-layer',
				type: 'raster',
				source: 'ign-plan',
				layout: { visibility: 'visible' }
			},
			{
				id: 'ign-ortho-layer',
				type: 'raster',
				source: 'ign-ortho',
				layout: { visibility: 'none' }
			},
			{
				id: 'ign-hillshade-layer',
				type: 'raster',
				source: 'ign-hillshade',
				layout: { visibility: 'none' },
				paint: { 'raster-opacity': 0.2 }
			},
			{
				id: 'ign-cadastre-layer',
				type: 'raster',
				source: 'ign-cadastre',
				layout: { visibility: 'none' }
			},
			{
				id: 'ign-protected-layer',
				type: 'raster',
				source: 'ign-protected',
				layout: { visibility: 'none' },
				paint: { 'raster-opacity': 0.55 }
			},
			{
				id: 'accuracy-circles',
				type: 'fill',
				source: 'accuracy-circles',
				paint: {
					'fill-color': ['get', 'color'],
					'fill-opacity': 0.15
				}
			},
			{
				id: 'accuracy-circles-outline',
				type: 'line',
				source: 'accuracy-circles',
				paint: {
					'line-color': ['get', 'color'],
					'line-width': 1
				}
			},
			{
				id: 'approach-line',
				type: 'line',
				source: 'approach',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#1a4d1a',
					'line-width': 3,
					'line-dasharray': [2, 2]
				}
			},
			{
				id: 'parking-approach-line',
				type: 'line',
				source: 'parking-approach',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#ea580c',
					'line-width': 3,
					'line-dasharray': [2, 2]
				}
			},
			{
				id: 'sight-line-layer',
				type: 'line',
				source: 'sight-line',
				layout: {
					'line-cap': 'round',
					'line-join': 'round'
				},
				paint: {
					'line-color': '#dc2626',
					'line-width': 2
				}
			}
		]
	};
}

/** Kept as an alias for backward compat — France-only call sites don't need to pass a country. */
export function createIgnMapStyle(): StyleSpecification {
	return createMapStyle('FR');
}

export function setBasemapVisibility(
	map: import('maplibre-gl').Map,
	basemap: MapBasemap
): void {
	const isTopo = basemap === 'topo';
	map.setLayoutProperty('ign-plan-layer', 'visibility', isTopo ? 'visible' : 'none');
	map.setLayoutProperty('ign-ortho-layer', 'visibility', isTopo ? 'none' : 'visible');
	map.setLayoutProperty('ign-hillshade-layer', 'visibility', isTopo ? 'none' : 'visible');
}

export function setCadastreLayerVisibility(
	map: import('maplibre-gl').Map,
	visible: boolean
): void {
	map.setLayoutProperty('ign-cadastre-layer', 'visibility', visible ? 'visible' : 'none');
}

export function setProtectedAreasLayerVisibility(
	map: import('maplibre-gl').Map,
	visible: boolean
): void {
	map.setLayoutProperty('ign-protected-layer', 'visibility', visible ? 'visible' : 'none');
}
