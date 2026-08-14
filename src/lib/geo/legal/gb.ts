import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildNbnAtlasSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * legislation.gov.uk — official UK legislation across nations.
 * - Theft Act 1968 s.4(3): picking wild mushrooms/flowers/fruit/foliage isn't theft unless for reward or sale.
 * - Forestry Act 1967 s.9: felling licence required for growing trees (subject to exemptions; England/Wales; Scotland has separate felling permission).
 * - Wildlife and Countryside Act 1981 s.13: Schedule 8 wild plants (pick/uproot/destroy) + general uprooting without landowner consent.
 * - Nature Conservation (Scotland) Act 2004 / Wildlife (Northern Ireland) Order 1985: nation-specific plant/SSSI regimes.
 */
export const gbLegalPack: LegalContentPack = {
	country: 'GB',
	sourceName: 'legislation.gov.uk',
	speciesSourceName: 'NBN Atlas',
	articles: [
		{
			id: 'gb_theft_act_1968_s4',
			group: 'property',
			url: 'https://www.legislation.gov.uk/ukpga/1968/60/section/4',
			title: 'Theft Act 1968, s.4(3)',
			summary:
				'Picking mushrooms, flowers, fruit or foliage from a wild plant on any land is not theft, unless done for reward, sale or other commercial purpose.'
		},
		{
			id: 'gb_forestry_act_1967_s9',
			group: 'forest',
			url: 'https://www.legislation.gov.uk/ukpga/1967/10/section/9',
			title: 'Forestry Act 1967, s.9',
			summary:
				'A felling licence is required to fell growing trees, subject to exemptions (small diameter, fruit trees, gardens, etc.).'
		},
		{
			id: 'gb_wildlife_countryside_act_1981_s13',
			group: 'environment',
			url: 'https://www.legislation.gov.uk/ukpga/1981/69/section/13',
			title: 'Wildlife and Countryside Act 1981, s.13',
			summary:
				'It is an offence to intentionally pick, uproot or destroy a wild plant listed in Schedule 8. Separately, uprooting any wild plant without the landowner’s consent is also an offence.'
		},
		{
			id: 'gb_nature_scotland_2004',
			group: 'environment',
			url: 'https://www.legislation.gov.uk/asp/2004/6',
			title: 'Nature Conservation (Scotland) Act 2004',
			summary:
				'Scottish framework for biodiversity and SSSIs. Check NatureScot plant licensing and Scottish Forestry felling permissions for collection or felling in Scotland.'
		},
		{
			id: 'gb_wildlife_ni_1985',
			group: 'environment',
			url: 'https://www.legislation.gov.uk/nisi/1985/171',
			title: 'Wildlife (Northern Ireland) Order 1985',
			summary:
				'Northern Ireland wildlife protection (including scheduled plants). Check DAERA / NIEA wildlife licensing before any collection.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.nbnAtlas,
	buildSpeciesSearchUrl: buildNbnAtlasSpeciesSearchUrl
};
