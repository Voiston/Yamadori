import type { CountryCode } from '$lib/geo/countries';
import { getMapProvider, type MapProviderLocation } from '$lib/geo/providers/map/registry';
import type { MapLayerConfig } from '$lib/geo/providers/map/types';
import type { MapBasemap } from '$lib/utils/map/styles';
import { countTilesForPolygon, type LngLat } from '$lib/utils/map/downloadRegion';
import { forecastPointsForRing } from '$lib/utils/offlineForecastGrid';
import {
	OFFLINE_PACK_BYTES_PER_TILE,
	offlinePackZoomLevels,
	type OfflineZoomBands
} from '$lib/utils/map/tileCache';

export type OfflinePackSelection = {
	maps: boolean;
	weather: boolean;
	cadastre: boolean;
	protectedAreas: boolean;
	viewZoom: boolean;
	walkZoom: boolean;
	detailZoom: boolean;
};

export type OfflinePackLayerKind = 'plan' | 'ortho' | 'hillshade' | 'cadastre' | 'protected';

export type OfflinePackLayer = {
	kind: OfflinePackLayerKind;
	maxZoom: number;
	tileTemplate: string;
	tilesAtZoom: Readonly<Record<number, number>>;
	zoomLevels: number[];
};

export type OfflinePackEstimate = {
	currentZoom: number;
	mapsTiles: number;
	cadastreTiles: number;
	protectedTiles: number;
	forecastCount: number;
	cadastreAvailable: boolean;
	protectedAvailable: boolean;
	layers: OfflinePackLayer[];
};

export const EMPTY_OFFLINE_PACK_ESTIMATE: OfflinePackEstimate = {
	currentZoom: 0,
	mapsTiles: 0,
	cadastreTiles: 0,
	protectedTiles: 0,
	forecastCount: 0,
	cadastreAvailable: false,
	protectedAvailable: false,
	layers: []
};

const DEFAULT_BANDS: OfflineZoomBands = { view: true, walk: true, detail: false };

function isDownloadableLayer(config: MapLayerConfig | null | undefined): config is MapLayerConfig {
	const url = config?.tiles?.[0];
	return typeof url === 'string' && url.length > 0 && !url.startsWith('data:');
}

function tilesAtZoom(ring: LngLat[], maxZoom: number): Record<number, number> {
	const counts: Record<number, number> = {};
	for (let zoom = 10; zoom <= maxZoom; zoom += 1) {
		counts[zoom] = countTilesForPolygon(ring, [zoom]);
	}
	return counts;
}

function layerFor(
	kind: OfflinePackLayerKind,
	config: MapLayerConfig,
	ring: LngLat[],
	currentZoom: number
): OfflinePackLayer {
	const counts = tilesAtZoom(ring, config.maxZoom);
	return {
		kind,
		maxZoom: config.maxZoom,
		tileTemplate: config.tiles[0],
		tilesAtZoom: counts,
		zoomLevels: offlinePackZoomLevels(currentZoom, config.maxZoom, DEFAULT_BANDS)
	};
}

export function zoomBandsForSelection(
	selection: Pick<OfflinePackSelection, 'viewZoom' | 'walkZoom' | 'detailZoom'>
): OfflineZoomBands {
	return {
		view: selection.viewZoom,
		walk: selection.walkZoom,
		detail: selection.detailZoom
	};
}

function countedTiles(layer: OfflinePackLayer, zoomLevels: number[]): number {
	let total = 0;
	for (const zoom of zoomLevels) {
		total += layer.tilesAtZoom[zoom] ?? 0;
	}
	return total;
}

export function resolveOfflinePack(input: {
	ring: LngLat[];
	currentZoom: number;
	basemap: MapBasemap;
	country: CountryCode | null;
	location: MapProviderLocation;
}): OfflinePackEstimate {
	const provider = getMapProvider(input.country, input.location);
	const layers: OfflinePackLayer[] = [];

	if (isDownloadableLayer(provider.plan)) {
		layers.push(layerFor('plan', provider.plan, input.ring, input.currentZoom));
	}
	if (isDownloadableLayer(provider.ortho)) {
		layers.push(layerFor('ortho', provider.ortho, input.ring, input.currentZoom));
	}
	if (input.basemap === 'satellite' && isDownloadableLayer(provider.hillshade)) {
		layers.push(layerFor('hillshade', provider.hillshade, input.ring, input.currentZoom));
	}

	const cadastre = isDownloadableLayer(provider.cadastreOverlay)
		? layerFor('cadastre', provider.cadastreOverlay, input.ring, input.currentZoom)
		: null;
	const protectedAreas = isDownloadableLayer(provider.protectedAreasOverlay)
		? layerFor('protected', provider.protectedAreasOverlay, input.ring, input.currentZoom)
		: null;

	if (cadastre) {
		layers.push(cadastre);
	}
	if (protectedAreas) {
		layers.push(protectedAreas);
	}

	const mapsTiles = layers
		.filter((layer) => layer.kind === 'plan' || layer.kind === 'ortho' || layer.kind === 'hillshade')
		.reduce((sum, layer) => sum + countedTiles(layer, layer.zoomLevels), 0);

	return {
		currentZoom: input.currentZoom,
		mapsTiles,
		cadastreTiles: cadastre ? countedTiles(cadastre, cadastre.zoomLevels) : 0,
		protectedTiles: protectedAreas ? countedTiles(protectedAreas, protectedAreas.zoomLevels) : 0,
		forecastCount: forecastPointsForRing(input.ring).length,
		cadastreAvailable: cadastre !== null,
		protectedAvailable: protectedAreas !== null,
		layers
	};
}

export function layersForSelection(
	estimate: OfflinePackEstimate,
	selection: OfflinePackSelection
): OfflinePackLayer[] {
	const bands = zoomBandsForSelection(selection);
	return estimate.layers
		.filter((layer) => {
			if (layer.kind === 'plan' || layer.kind === 'ortho' || layer.kind === 'hillshade') {
				return selection.maps;
			}
			if (layer.kind === 'cadastre') {
				return selection.cadastre;
			}
			return selection.protectedAreas;
		})
		.map((layer) => ({
			...layer,
			zoomLevels: offlinePackZoomLevels(estimate.currentZoom, layer.maxZoom, bands)
		}))
		.filter((layer) => layer.zoomLevels.length > 0);
}

export function selectedOfflinePackTiles(
	estimate: OfflinePackEstimate,
	selection: Pick<
		OfflinePackSelection,
		'maps' | 'cadastre' | 'protectedAreas' | 'viewZoom' | 'walkZoom' | 'detailZoom'
	>
): number {
	const layers = layersForSelection(estimate, {
		...selection,
		weather: false
	});
	return layers.reduce((sum, layer) => sum + countedTiles(layer, layer.zoomLevels), 0);
}

export function selectedPackZoomLevels(
	estimate: OfflinePackEstimate,
	selection: OfflinePackSelection
): number[] {
	const levels = new Set<number>();
	for (const layer of layersForSelection(estimate, selection)) {
		for (const zoom of layer.zoomLevels) {
			levels.add(zoom);
		}
	}
	return [...levels].sort((left, right) => left - right);
}

export function detailZoomAvailable(
	estimate: OfflinePackEstimate,
	selection: Pick<OfflinePackSelection, 'maps' | 'cadastre' | 'protectedAreas'>
): boolean {
	return estimate.layers.some((layer) => {
		if (layer.maxZoom < 17) {
			return false;
		}
		if (layer.kind === 'plan' || layer.kind === 'ortho' || layer.kind === 'hillshade') {
			return selection.maps;
		}
		if (layer.kind === 'cadastre') {
			return selection.cadastre;
		}
		return selection.protectedAreas;
	});
}

export function offlinePackSizeBytes(tileCount: number): number {
	return tileCount * OFFLINE_PACK_BYTES_PER_TILE;
}
