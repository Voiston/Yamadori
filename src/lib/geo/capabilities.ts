import type { CountryCode } from '$lib/geo/countries';
import { getCadastreCoverageLevel } from '$lib/geo/countries';

export type CapabilityLevel = 'full' | 'partial' | 'none';

export type GeoCapabilities = {
	country: CountryCode | null;
	cadastre: CapabilityLevel;
	protectedAreas: CapabilityLevel;
	municipality: CapabilityLevel;
	/** Curated offline species-protection pack (never exhaustive of all flora). */
	speciesProtection: CapabilityLevel;
};

/**
 * Declares which field tools are available for a resolved country.
 * Used for honest UX banners when a feature is missing or partial.
 */
export function getGeoCapabilities(country: CountryCode | null): GeoCapabilities {
	if (!country) {
		return {
			country: null,
			cadastre: 'none',
			protectedAreas: 'none',
			municipality: 'none',
			speciesProtection: 'none'
		};
	}

	switch (country) {
		case 'FR':
			return {
				country,
				cadastre: 'full',
				protectedAreas: 'full',
				municipality: 'full',
				speciesProtection: 'full'
			};
		case 'ES':
		case 'IT':
			return {
				country,
				cadastre: 'full',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'DE':
			return {
				country,
				cadastre: getCadastreCoverageLevel('DE'),
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'GB':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'CH':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'partial',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'AT':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'BE':
			return {
				country,
				cadastre: 'full',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'NL':
			return {
				country,
				cadastre: 'full',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'SE':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'NO':
			return {
				country,
				cadastre: 'full',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'US':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'CA':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'NZ':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'PT':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'IE':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'DK':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'FI':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'AU':
			return {
				country,
				cadastre: 'partial',
				protectedAreas: 'full',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		case 'JP':
			return {
				country,
				cadastre: 'partial',
				/**
				 * Static MOE national-park polygons (+ optional KSJ A10 merge).
				 * Partial: prefectural parks / 国有林 not fully covered; no live API key.
				 * Never fall through to EEA.
				 */
				protectedAreas: 'partial',
				municipality: 'partial',
				speciesProtection: 'partial'
			};
		default:
			return {
				country,
				cadastre: 'none',
				protectedAreas: 'none',
				municipality: 'none',
				speciesProtection: 'none'
			};
	}
}

export function hasPartialOrMissingCapability(caps: GeoCapabilities): boolean {
	return (
		caps.cadastre !== 'full' ||
		caps.protectedAreas !== 'full' ||
		caps.municipality !== 'full' ||
		caps.speciesProtection !== 'full'
	);
}
