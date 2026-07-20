import { resolveCountry } from '$lib/geo/resolveCountry';
import { matchSpeciesProtectionEntry } from '$lib/geo/providers/species-protection/match';
import { getSpeciesProtectionPack } from '$lib/geo/providers/species-protection/packs';
import type {
	SpeciesProtectionHit,
	SpeciesProtectionScan
} from '$lib/geo/providers/species-protection/types';

function emptyScan(
	country: SpeciesProtectionScan['country'],
	coverage: SpeciesProtectionScan['coverage']
): SpeciesProtectionScan {
	return {
		scannedAt: new Date().toISOString(),
		country,
		hit: null,
		coverage
	};
}

/**
 * Offline curated lookup of protected / regulated woody taxa for the GPS country.
 * Non-exhaustive — always pair with official source links in UI.
 */
export function lookupSpeciesProtection(
	species: string,
	latitude: number,
	longitude: number
): SpeciesProtectionScan {
	const country = resolveCountry(latitude, longitude);
	const pack = getSpeciesProtectionPack(country);
	if (!pack) return emptyScan(country, 'unsupported');

	const matched = matchSpeciesProtectionEntry(species, pack.entries);
	if (!matched) {
		return emptyScan(country, pack.coverage);
	}

	const hit: SpeciesProtectionHit = {
		id: matched.entry.id,
		label: matched.entry.label,
		matchedName: matched.matchedName,
		level: matched.entry.level,
		scope: matched.entry.scope,
		sourceName: pack.sourceName,
		sourceUrl: pack.buildSourceUrl(species.trim() || matched.entry.label)
	};

	return {
		scannedAt: new Date().toISOString(),
		country,
		hit,
		coverage: pack.coverage
	};
}

/** Convenience for autocomplete when coords are known. */
export function lookupSpeciesProtectionHit(
	species: string,
	latitude: number | null | undefined,
	longitude: number | null | undefined
): SpeciesProtectionHit | null {
	if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return lookupSpeciesProtection(species, latitude, longitude).hit;
}
