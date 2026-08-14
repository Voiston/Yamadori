import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildArtfaktaSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Swedish nature / forest law for yamadori:
 * - Allemansrätten: public access ≠ right to uproot living trees.
 * - Artskyddsförordningen (2007:845): fridlysning (incl. certain län for Idegran/Tibast).
 * - Skogsvårdslagen (1979:429): forest management / avverkning rules.
 */
export const seLegalPack: LegalContentPack = {
	country: 'SE',
	sourceName: 'Naturvårdsverket / riksdagen.se',
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
			id: 'se_skogsvardslagen',
			group: 'forest',
			url: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/skogsvardslag-1979429_sfs-1979-429/',
			title: 'Skogsvårdslag (1979:429)',
			summary:
				'Reglerar skogsbruk, avverkning och hänsyn. Yamadori / uppgrävning av levande träd utan markägarens tillstånd är inte tillåten under allemansrätten och kan kräva anmälan eller tillstånd i skogliga sammanhang.'
		},
		{
			id: 'se_artskyddsforordning',
			group: 'environment',
			url: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/artskyddsforordning-2007845_sfs-2007-845/',
			title: 'Artskyddsförordning (2007:845)',
			summary:
				'Fridlysning av växter och djur (7–9 §§ och bilagor). Vissa arter, t.ex. idegran och tibast, är fridlysta endast i vissa län — kontrollera Artfakta / Länsstyrelsen innan plockning eller grävning.'
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
