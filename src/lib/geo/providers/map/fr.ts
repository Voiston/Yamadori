import {
	buildIgnLayerTileUrl,
	buildIgnTileUrl,
	CADASTRE_LAYER,
	PROTECTED_AREAS_LAYER,
	getIgnLayerConfig
} from '$lib/utils/map/ign';
import type { CountryMapProvider } from './types';

const TILE_SIZE = 256;

/**
 * Wraps the existing IGN Géoplateforme WMTS integration (`$lib/utils/map/ign`)
 * so France keeps its current tile URLs/attribution/zoom limits unchanged.
 */
export function createFrMapProvider(): CountryMapProvider {
	const plan = getIgnLayerConfig('plan');
	const ortho = getIgnLayerConfig('ortho');
	const hillshade = getIgnLayerConfig('hillshade');

	return {
		country: 'FR',
		plan: {
			tiles: [buildIgnTileUrl('plan')],
			tileSize: TILE_SIZE,
			attribution: plan.attribution,
			maxZoom: plan.maxZoom
		},
		ortho: {
			tiles: [buildIgnTileUrl('ortho')],
			tileSize: TILE_SIZE,
			attribution: ortho.attribution,
			maxZoom: ortho.maxZoom
		},
		hillshade: {
			tiles: [buildIgnTileUrl('hillshade')],
			tileSize: TILE_SIZE,
			attribution: hillshade.attribution,
			maxZoom: hillshade.maxZoom
		},
		cadastreOverlay: {
			tiles: [buildIgnLayerTileUrl(CADASTRE_LAYER)],
			tileSize: TILE_SIZE,
			attribution: CADASTRE_LAYER.attribution,
			maxZoom: CADASTRE_LAYER.maxZoom
		},
		protectedAreasOverlay: {
			tiles: [buildIgnLayerTileUrl(PROTECTED_AREAS_LAYER)],
			tileSize: TILE_SIZE,
			attribution: PROTECTED_AREAS_LAYER.attribution,
			maxZoom: PROTECTED_AREAS_LAYER.maxZoom
		}
	};
}
