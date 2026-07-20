import type { LegalContentPack } from '$lib/geo/legal/types';

const ECOS_SEARCH_BASE = 'https://ecos.fws.gov/ecp/report/species';
const GBIF_SPECIES_SEARCH_BASE = 'https://www.gbif.org/species/search';

function buildSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return GBIF_SPECIES_SEARCH_BASE;
	return `${GBIF_SPECIES_SEARCH_BASE}?${new URLSearchParams({ q: query })}`;
}

/**
 * US legal content pack — federal framework only.
 * Rules vary by district / state; articles are indicative links, not a green light.
 */
export const usLegalPack: LegalContentPack = {
	country: 'US',
	sourceName: 'USDA Forest Service / BLM / FWS',
	speciesSourceName: 'GBIF / ECOS FWS',
	articles: [
		{
			id: 'us_private_property',
			group: 'property',
			url: 'https://www.law.cornell.edu/wex/trespass',
			title: 'Private property & trespass',
			summary:
				'On private land, collecting or uprooting plants requires the landowner’s permission. Entering without consent may be trespass.'
		},
		{
			id: 'us_usfs_sfp',
			group: 'forest',
			url: 'https://www.fs.usda.gov/managing-land/forest-management/products',
			title: 'USFS Special Forest Products',
			summary:
				'On National Forest System lands, collecting plants, transplants, or other special forest products generally requires a permit from the local Ranger District. Rules vary by forest.'
		},
		{
			id: 'us_blm_plants',
			group: 'forest',
			url: 'https://www.blm.gov/programs/natural-resources/forests-and-woodlands',
			title: 'BLM plant materials',
			summary:
				'On BLM public lands, collecting living plants or transplanting trees may require authorization. Check the local BLM field office before collecting.'
		},
		{
			id: 'us_nps_prohibited',
			group: 'environment',
			url: 'https://www.nps.gov/subjects/policy/laws.htm',
			title: 'National Parks — plant removal prohibited',
			summary:
				'Removing, digging, or damaging plants in National Parks and most wilderness areas is prohibited.'
		},
		{
			id: 'us_esa_plants',
			group: 'environment',
			url: ECOS_SEARCH_BASE,
			title: 'Endangered Species Act — plants',
			summary:
				'Federally listed threatened or endangered plants are protected. State lists may add further restrictions. Always verify the species before collecting.'
		}
	],
	speciesSearchBase: GBIF_SPECIES_SEARCH_BASE,
	buildSpeciesSearchUrl
};
