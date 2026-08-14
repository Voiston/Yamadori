import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildNbdcSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Irish property / forestry / wildlife law for yamadori:
 * - Land and Conveyancing Law Reform Act 2009: ownership of what grows on land.
 * - Forestry Act 2014: felling licences.
 * - Wildlife Act 1976 + Flora (Protection) Order 2022: protected plants & sites.
 */
export const ieLegalPack: LegalContentPack = {
	country: 'IE',
	sourceName: 'Irish Statute Book / NPWS',
	speciesSourceName: 'NBDC / Biodiversity Ireland',
	articles: [
		{
			id: 'ie_property',
			group: 'property',
			url: 'https://www.irishstatutebook.ie/eli/2009/act/27/enacted/en/html',
			title: 'Land and Conveyancing Law Reform Act 2009 — ownership',
			summary:
				'What is planted on land generally belongs to the landowner. Harvesting or transplanting trees requires the owner’s permission (or another lawful authority).'
		},
		{
			id: 'ie_forestry',
			group: 'forest',
			url: 'https://www.irishstatutebook.ie/eli/2014/act/31/enacted/en/html',
			title: 'Forestry Act 2014 — felling & forest management',
			summary:
				'Felling and forest operations are regulated. On Coillte or other managed forests, and for many private fellings, a licence or consent from the competent authority is required.'
		},
		{
			id: 'ie_wildlife',
			group: 'environment',
			url: 'https://www.irishstatutebook.ie/eli/1976/act/39/enacted/en/html',
			title: 'Wildlife Act 1976 — protected areas & species',
			summary:
				'National parks, SACs, SPAs, NHAs and protected species restrict taking plants and altering habitats. Always check site designation and species status with NPWS before any collection.'
		},
		{
			id: 'ie_fpo',
			group: 'environment',
			url: 'https://www.npws.ie/legislation/irish-law/flora-protection-order-1999',
			title: 'Flora (Protection) Order 2022 — NPWS',
			summary:
				'It is illegal to cut, uproot or damage listed plants, or to interfere with their habitats, wherever they occur. A licence is required for any exception — check the FPO schedules before collecting.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.nbdc,
	buildSpeciesSearchUrl: buildNbdcSpeciesSearchUrl
};
