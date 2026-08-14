import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildInfoFloraSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Fedlex (Swiss federal legislation portal).
 * - CC Art. 699: access to forests/pastures and gathering wild berries/mushrooms (cantonal limits).
 * - Forest Act (WaG) Art. 14: recreational access to forest.
 * - Nature and Cultural Heritage Act (NHG) Art. 18 / 20: protected species and biotopes.
 */
export const chLegalPack: LegalContentPack = {
	country: 'CH',
	sourceName: 'Fedlex',
	speciesSourceName: 'Info Flora',
	articles: [
		{
			id: 'ch_cc_699',
			group: 'property',
			url: 'https://www.fedlex.admin.ch/eli/cc/24/233_245_233/en#art_699',
			title: 'CC Art. 699 — Access and gathering',
			summary:
				'Everyone may enter forests and pastures and gather wild berries, mushrooms and the like to the extent customary — subject to cantonal restrictions and private property rights.'
		},
		{
			id: 'ch_wag_14',
			group: 'forest',
			url: 'https://www.fedlex.admin.ch/eli/cc/1992/2521_2521_2521/en#art_14',
			title: 'WaG Art. 14 — Access to the forest',
			summary:
				'The forest is accessible to the public. Cantons may restrict access where necessary for forest conservation or other public interests.'
		},
		{
			id: 'ch_nhg_18',
			group: 'environment',
			url: 'https://www.fedlex.admin.ch/eli/cc/1966/1637_1694_1679/en#art_18',
			title: 'NHG Art. 18 — Protection of species',
			summary:
				'Animal and plant species that are rare or endangered are protected. Removal, damage or destruction of protected plants is prohibited except where authorised.'
		},
		{
			id: 'ch_nhg_20',
			group: 'environment',
			url: 'https://www.fedlex.admin.ch/eli/cc/1966/1637_1694_1679/en#art_20',
			title: 'NHG Art. 20 — Protection of biotopes',
			summary:
				'Biotopes that are worthy of protection (banks, fens, dry meadows, forest edges, etc.) must be preserved. Cantons designate and protect them.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.infoFlora,
	buildSpeciesSearchUrl: buildInfoFloraSpeciesSearchUrl
};
