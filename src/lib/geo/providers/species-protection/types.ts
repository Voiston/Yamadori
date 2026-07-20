import type { CountryCode } from '$lib/geo/countries';
import type { ProtectedZoneLevel } from '$lib/types/harvest-ethics';

export type SpeciesProtectionScope = 'national' | 'regional';

/** One curated protected-taxon entry (aliases for matching). */
export type SpeciesProtectionEntry = {
	id: string;
	level: ProtectedZoneLevel;
	scope: SpeciesProtectionScope;
	/** Vernacular + scientific names used for fuzzy match. */
	names: readonly string[];
	/** Short display label (usually primary vernacular or scientific). */
	label: string;
};

export type SpeciesProtectionHit = {
	id: string;
	label: string;
	matchedName: string;
	level: ProtectedZoneLevel;
	scope: SpeciesProtectionScope;
	sourceName: string;
	sourceUrl: string;
};

export type SpeciesProtectionScan = {
	scannedAt: string;
	country: CountryCode | null;
	hit: SpeciesProtectionHit | null;
	/**
	 * - full: curated national pack for yamadori-relevant taxa (still non-exhaustive)
	 * - partial: shorter pack / regional-only coverage
	 * - unsupported: no pack for this jurisdiction
	 */
	coverage: 'full' | 'partial' | 'unsupported';
};

export type SpeciesProtectionPack = {
	country: CountryCode;
	coverage: 'full' | 'partial';
	sourceName: string;
	buildSourceUrl: (species: string) => string;
	entries: readonly SpeciesProtectionEntry[];
};
