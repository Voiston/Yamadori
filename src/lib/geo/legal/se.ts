import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildArtfaktaSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Allemansrätten (Sweden) — right of public access is NOT a right to dig up trees.
 * Berries/mushrooms ≠ uprooting or cutting living trees without the landowner’s consent.
 */
export const seLegalPack: LegalContentPack = {
	country: 'SE',
	sourceName: 'Naturvårdsverket',
	speciesSourceName: 'Artfakta (SLU)',
	articles: [
		{
			id: 'se_allemansratten_hub',
			group: 'property',
			url: 'https://www.naturvardsverket.se/allemansratten/',
			title: 'Allemansrätten — vad gäller?',
			summary:
				'Allemansrätten ger rätt att vistas i naturen, men inte att skada mark eller egendom. Att gräva upp eller hugga levande träd kräver alltid markägarens uttryckliga tillstånd — bär och svamp är något annat.'
		},
		{
			id: 'se_miljobalk_7_1',
			group: 'environment',
			url: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/miljobalk-1998808_sfs-1998-808/',
			title: 'Miljöbalken — skydd av naturen',
			summary:
				'Miljöbalken och områdesskydd kan ytterligare begränsa vad som får plockas eller grävas upp. I skyddade områden och för fridlysta arter kan even enkel plockning vara förbjuden.'
		},
		{
			id: 'se_forest_landowner',
			group: 'forest',
			url: 'https://www.naturvardsverket.se/vagledning-och-stod/allemansratten/fragor-och-svar/',
			title: 'Skog och markägare — FAQ Allemansrätten',
			summary:
				'I skog gäller allemansrätten med restriktioner: ingen skada på växande skog, inga bränder, håll avstånd till tomter. Yamadori / bonsai-grävning utan tillstånd är inte tillåten.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.artfakta,
	buildSpeciesSearchUrl: buildArtfaktaSpeciesSearchUrl
};
