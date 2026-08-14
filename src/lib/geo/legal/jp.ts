import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	JP_LEGAL_HUMAN_REVIEW,
	JP_LEGAL_SOURCES,
	JP_PERMIT_SOURCE_URLS
} from '$lib/geo/legal/jpSources';

const MOE_SPECIES_BASE = JP_PERMIT_SOURCE_URLS.moeEndangeredSpecies;
const MOE_DESIGNATED = JP_PERMIT_SOURCE_URLS.moeDesignatedPlants;

function buildMoeSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	// MOE hubs have no public query API — land on designated-plant lists when a taxon is named.
	if (!query) return MOE_SPECIES_BASE;
	return MOE_DESIGNATED;
}

/**
 * Japan legal content pack — national layer, article-level (FR granularity).
 *
 * Review gate: see `JP_LEGAL_HUMAN_REVIEW` in `jpSources.ts`.
 * Prefectoral ordinances and park-specific designated-plant lists are out of scope.
 */
export const jpLegalPack: LegalContentPack = {
	country: 'JP',
	sourceName: 'e-Gov / Japanese Law Translation / MOE',
	speciesSourceName: 'MOE / 指定植物 / 種の保存法',
	articles: JP_LEGAL_SOURCES.map((row) => ({
		id: row.id,
		group: row.group,
		url: row.url,
		title: `${row.instrument} — ${row.provision}`,
		summary: row.uiClaim
	})),
	speciesSearchBase: MOE_SPECIES_BASE,
	buildSpeciesSearchUrl: buildMoeSpeciesSearchUrl
};

export { JP_LEGAL_HUMAN_REVIEW, JP_LEGAL_SOURCES };
