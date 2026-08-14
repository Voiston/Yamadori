import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildArtsdatabankenSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Norwegian access / nature / forest law for yamadori:
 * - Friluftsloven: allemannsretten (access ≠ uprooting living trees).
 * - Naturmangfoldloven: vern, arter, uttak.
 * - Skogbrukslova: forest management rules.
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
			id: 'no_skogbruksloven',
			group: 'forest',
			url: 'https://lovdata.no/dokument/NL/lov/2005-05-27-31',
			title: 'Skogbrukslova (2005)',
			summary:
				'Regulerer skogbruk og hogst. Utgraving av levende trær uten grunneiers samtykke er ikke en allemannsrett — sjekk også lokale hogstregler og Statsforvalteren.'
		},
		{
			id: 'no_naturmangfoldloven',
			group: 'environment',
			url: 'https://lovdata.no/dokument/NL/lov/2009-06-19-100',
			title: 'Naturmangfoldloven (2009)',
			summary:
				'Ramme for vern av natur og arter. I verneområder og for fredede arter gjelder strengere regler — plukking eller uttak kan være forbudt. Sjekk Artsdatabanken og lokal verneforskrift.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.artsdatabanken,
	buildSpeciesSearchUrl: buildArtsdatabankenSpeciesSearchUrl
};
