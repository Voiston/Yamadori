import type { StyleSpecification } from 'maplibre-gl';
import { buildIgnLayerTileUrl, buildIgnTileUrl, CADASTRE_LAYER, getIgnLayerConfig } from './ign';

export type MapBasemap = 'topo' | 'satellite';

export function createIgnMapStyle(): StyleSpecification {
	const plan = getIgnLayerConfig('plan');
	const ortho = getIgnLayerConfig('ortho');
	const hillshade = getIgnLayerConfig('hillshade');

	return {
		version: 8,
		sources: {
			'ign-plan': {
				type: 'raster',
				tiles: [buildIgnTileUrl('plan')],
				tileSize: 256,
				attribution: plan.attribution,
				maxzoom: plan.maxZoom
			},
			'ign-ortho': {
				type: 'raster',
				tiles: [buildIgnTileUrl('ortho')],
				tileSize: 256,
				attribution: ortho.attribution,
				maxzoom: ortho.maxZoom
			},
			'ign-hillshade': {
				type: 'raster',
				tiles: [buildIgnTileUrl('hillshade')],
				tileSize: 256,
				attribution: hillshade.attribution,
				maxzoom: hillshade.maxZoom
			},
			'ign-cadastre': {
				type: 'raster',
				tiles: [buildIgnLayerTileUrl(CADASTRE_LAYER)],
				tileSize: 256,
				attribution: CADASTRE_LAYER.attribution,
				maxzoom: CADASTRE_LAYER.maxZoom
			},
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
