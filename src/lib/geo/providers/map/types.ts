import type { CountryCode } from '$lib/geo/countries';

/** Basemap raster layers every country provider must be able to supply. */
export type BasemapLayerId = 'plan' | 'ortho' | 'hillshade';

/** A single MapLibre-compatible raster tile source, provider-agnostic. */
export type MapLayerConfig = {
	/** URL template(s) with {z}/{x}/{y} (or a pre-resolved WMTS query string using the same placeholders). */
	tiles: string[];
	tileSize?: number;
	attribution: string;
	maxZoom: number;
	/** Defaults to 'xyz' (MapLibre's default) when omitted. */
	scheme?: 'xyz' | 'tms';
};

/**
 * Country code understood by the map provider registry. `'INTL'` is used for
 * the generic fallback served when GPS coordinates cannot be resolved to one
 * of the explicitly supported countries.
 */
export type MapProviderCountryCode = CountryCode | 'INTL';

export type CountryMapProvider = {
	country: MapProviderCountryCode;
	plan: MapLayerConfig;
	ortho: MapLayerConfig;
	/** `null` when the country has no free/public hillshade tile service. */
	hillshade?: MapLayerConfig | null;
	/** `null` when cadastre is only available as an on-demand WMS (not tileable) or has no public service. */
	cadastreOverlay?: MapLayerConfig | null;
	/** Optional protected-areas raster overlay for point verification (not zone discovery). */
	protectedAreasOverlay?: MapLayerConfig | null;
};
