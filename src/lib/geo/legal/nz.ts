import type { LegalContentPack } from '$lib/geo/legal/types';

const DOC_PERMISSIONS =
	'https://www.doc.govt.nz/get-involved/apply-for-permits/research-and-collection/';
const GBIF_SPECIES_SEARCH_BASE = 'https://www.gbif.org/species/search';

function buildSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return GBIF_SPECIES_SEARCH_BASE;
	return `${GBIF_SPECIES_SEARCH_BASE}?${new URLSearchParams({ q: query })}`;
}

/**
 * New Zealand legal content pack — DOC public conservation land + private property.
 * Articles are indicative starting points, not legal advice.
 */
export const nzLegalPack: LegalContentPack = {
	country: 'NZ',
	sourceName: 'DOC / Conservation Act',
	speciesSourceName: 'GBIF / Wildlife Act',
	articles: [
		{
			id: 'nz_private_property',
			group: 'property',
			url: 'https://www.legislation.govt.nz/act/public/1980/0094/latest/whole.html',
			title: 'Private property & trespass',
			summary:
				'On private land, collecting or uprooting plants requires the landowner’s permission. Trespass Act 1980 applies.'
		},
		{
			id: 'nz_conservation_act',
			group: 'forest',
			url: 'https://www.legislation.govt.nz/act/public/1987/0065/latest/DLM106613.html',
			title: 'Conservation Act — taking of plants',
			summary:
				'Taking plants from a conservation area without DOC authority is an offence (Conservation Act s30). DOC Form 10 covers research/collection authorisations.'
		},
		{
			id: 'nz_national_parks',
			group: 'environment',
			url: 'https://www.legislation.govt.nz/act/public/1980/0066/latest/whole.html',
			title: 'National Parks Act 1980',
			summary:
				'National parks are strictly protected. Removing or damaging plants without authorisation is prohibited.'
		},
		{
			id: 'nz_wildlife',
			group: 'environment',
			url: 'https://www.legislation.govt.nz/act/public/1953/0031/latest/whole.html',
			title: 'Wildlife Act 1953',
			summary:
				'Many native animals (and some plants via other schedules) are protected. Always verify species status before collecting. Iwi / Whenua Rahui areas need governing authority consent.'
		}
	],
	speciesSearchBase: GBIF_SPECIES_SEARCH_BASE,
	buildSpeciesSearchUrl
};

export { DOC_PERMISSIONS };
