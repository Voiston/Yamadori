import type { LegalContentPack } from '$lib/geo/legal/types';

const ECOS_SEARCH_BASE = 'https://ecos.fws.gov/ecp/report/species';

function buildSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ECOS_SEARCH_BASE;
	return `${ECOS_SEARCH_BASE}?${new URLSearchParams({ status: 'Listed', q: query })}`;
}

/**
 * US legal content pack — federal framework only.
 * Rules vary by district / state; articles are indicative links, not a green light.
 */
export const usLegalPack: LegalContentPack = {
	country: 'US',
	sourceName: 'USDA Forest Service / BLM / FWS / NPS',
	speciesSourceName: 'ECOS FWS',
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
			url: 'https://www.blm.gov/programs/natural-resources/forests-and-woodlands/forest-product-permits',
			title: 'BLM forest product permits',
			summary:
				'On BLM public lands, collecting living plants or transplanting trees may require authorization. Use the forest product permit process and contact the local BLM field office before collecting.'
		},
		{
			id: 'us_nps_prohibited',
			group: 'environment',
			url: 'https://www.ecfr.gov/current/title-36/chapter-I/part-2/section-2.1',
			title: '36 CFR 2.1 — plant removal prohibited',
			summary:
				'Removing, digging, or damaging plants in National Parks and most wilderness areas is prohibited under NPS regulations (36 CFR 2.1), except limited berry/nut gathering where a superintendent authorizes it.'
		},
		{
			id: 'us_esa_plants',
			group: 'environment',
			url: ECOS_SEARCH_BASE,
			title: 'Endangered Species Act — plants',
			summary:
				'Federally listed threatened or endangered plants are protected (e.g. Florida torreya Endangered; whitebark pine Threatened with a 4(d) rule). State lists may add further restrictions. Always verify the species before collecting.'
		}
	],
	speciesSearchBase: ECOS_SEARCH_BASE,
	buildSpeciesSearchUrl
};
