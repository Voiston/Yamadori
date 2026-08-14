import { normalizeSpeciesQuery } from '$lib/utils/species-filter';

/**
 * Exact match of a free-text species query against a canonical name and optional aliases.
 * Used by harvest calendars so DE/IT/JP local names still trigger YRS priors.
 */
export function matchHarvestSpecies(
	query: string,
	canonical: string,
	aliases: readonly string[] = []
): boolean {
	const q = normalizeSpeciesQuery(query.trim());
	if (!q) return false;
	for (const name of [canonical, ...aliases]) {
		if (normalizeSpeciesQuery(name.trim()) === q) return true;
	}
	return false;
}
