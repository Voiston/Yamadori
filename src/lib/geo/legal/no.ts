import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildArtsdatabankenSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Allemannsretten (Norway) — friluftsloven. Access ≠ removing living trees.
 */
export const noLegalPack: LegalContentPack = {
	country: 'NO',
	sourceName: 'Lovdata / Miljødirektoratet',
	speciesSourceName: 'Artsdatabanken',
	articles: [
		{
			id: 'no_friluftsloven',
			group: 'property',
			url: 'https://lovdata.no/dokument/NL/lov/1957-06-28-16/',
			title: 'Friluftsloven — allemannsretten',
			summary:
				'Allemannsretten gir rett til ferdsel og opphold i utmark, og plukking av bær og sopp innen rimelige grenser. Den gir ikke rett til å grave opp eller hogge levende trær uten grunneiers samtykke.'
		},
		{
			id: 'no_allemannsretten_hub',
			group: 'forest',
			url: 'https://www.miljodirektoratet.no/ansvarsomrader/friluftsliv/friluftsliv-og-allemannsretten/allemannsretten/',
			title: 'Miljødirektoratet — allemannsretten',
			summary:
				'Offisiell veiledning: vis hensyn, ikke skad vegetasjon eller eiendom. Yamadori / utgraving av trær krever alltid avtale med grunneier — også der allemannsretten gjelder.'
		},
		{
			id: 'no_nature_species',
			group: 'environment',
			url: 'https://www.miljodirektoratet.no/ansvarsomrader/friluftsliv/friluftsliv-og-allemannsretten/allemannsretten/ofte-stilte-sporsmal-om-allemannsretten/',
			title: 'FAQ allemannsretten — begrensninger',
			summary:
				'I verneområder og for fredede arter gjelder strengere regler. Sjekk lokale forskrifter før du plukker planter — og aldri ta hele trær uten tillatelse.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.artsdatabanken,
	buildSpeciesSearchUrl: buildArtsdatabankenSpeciesSearchUrl
};
