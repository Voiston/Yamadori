import type { CountryCode } from '$lib/geo/countries';
import { createAtMapProvider } from './at';
import { createBeMapProvider } from './be';
import { createChMapProvider } from './ch';
import { createDeMapProvider } from './de';
import { createEsMapProvider } from './es';
import { createFrMapProvider } from './fr';
import { createGbMapProvider } from './gb';
import { createInternationalMapProvider } from './international';
import { createItMapProvider } from './it';
import { createNlMapProvider } from './nl';
import { createNoMapProvider } from './no';
import { createSeMapProvider } from './se';
import { createUsMapProvider } from './us';
import { createCaMapProvider } from './ca';
import { createNzMapProvider } from './nz';
import { createPtMapProvider } from './pt';
import type { CountryMapProvider } from './types';

export type MapProviderLocation = {
	latitude: number;
	longitude: number;
};

/**
 * Resolves the tile provider for a resolved country. `null` (country not
 * resolved, e.g. GPS unavailable or coordinates outside every supported
 * bbox) intentionally uses the international fallback rather than defaulting
 * to France, so the map still renders usable tiles for users anywhere in the
 * world. Use `createIgnMapStyle()` / `createMapStyle('FR')` directly when the
 * previous FR-only behavior is explicitly desired.
 *
 * Optional `location` selects nation-specific overlays (e.g. GB Scotland vs England).
 */
export function getMapProvider(
	country: CountryCode | null,
	location?: MapProviderLocation
): CountryMapProvider {
	switch (country) {
		case 'FR':
			return createFrMapProvider();
		case 'ES':
			return createEsMapProvider();
		case 'IT':
			return createItMapProvider();
		case 'DE':
			return createDeMapProvider();
		case 'GB':
			return createGbMapProvider(location);
		case 'CH':
			return createChMapProvider();
		case 'AT':
			return createAtMapProvider();
		case 'BE':
			return createBeMapProvider();
		case 'NL':
			return createNlMapProvider();
		case 'SE':
			return createSeMapProvider();
		case 'NO':
			return createNoMapProvider();
		case 'US':
			return createUsMapProvider();
		case 'CA':
			return createCaMapProvider();
		case 'NZ':
			return createNzMapProvider();
		case 'PT':
			return createPtMapProvider();
		default:
			return createInternationalMapProvider();
	}
}
