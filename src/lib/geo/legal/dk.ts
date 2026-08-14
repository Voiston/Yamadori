import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildArterDkSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Danish nature / forest law for yamadori:
 * - Adgangsbekendtgørelsen: public access ≠ right to uproot living trees.
 * - Skovloven (lbk 690/2023): fredskov / forest management.
 * - Naturbeskyttelsesloven (lbk 927/2024): §3, Natura 2000, fredninger.
 * - Artsfredningsbekendtgørelsen (BEK 521/2021): fredede planter (bilag 2).
 */
export const dkLegalPack: LegalContentPack = {
	country: 'DK',
	sourceName: 'Naturstyrelsen / retsinformation.dk',
	speciesSourceName: 'Arter.dk',
	articles: [
		{
			id: 'dk_property',
			group: 'property',
			url: 'https://www.retsinformation.dk/eli/lta/2016/852',
			title: 'Adgangsbekendtgørelsen — færdsel ≠ opgravning',
			summary:
				'Offentlighedens adgang giver ret til at færdes og opholde sig i naturen inden for lovens rammer. Den giver ikke ret til at grave levende træer op eller fælde uden ejerens tilladelse (eller anden lovlig hjemmel).'
		},
		{
			id: 'dk_forest',
			group: 'forest',
			url: 'https://naturstyrelsen.dk/regler-og-tilladelser/aktiviteter-og-tilladelser-paa-naturstyrelsens-arealer',
			title: 'Naturstyrelsen — aktiviteter og tilladelser',
			summary:
				'På Naturstyrelsens arealer kræver mange aktiviteter — herunder indgreb der påvirker vegetation — tilladelse fra styrelsen. Privat skov følger aftale med ejeren og skovlovens regler.'
		},
		{
			id: 'dk_skovloven',
			group: 'forest',
			url: 'https://www.retsinformation.dk/eli/lta/2023/690',
			title: 'Skovloven (lbk nr. 690 af 26/06/2023)',
			summary:
				'Regulerer skovbrug, fredskovspligt og hensyn i skov. Opgravning af levende træer uden ejerens tilladelse er ikke en del af offentlighedens adgang og kan kræve tilladelse efter skov- eller naturbeskyttelsesregler.'
		},
		{
			id: 'dk_nature',
			group: 'environment',
			url: 'https://www.retsinformation.dk/eli/lta/2024/927',
			title: 'Naturbeskyttelsesloven (lbk nr. 927 af 28/06/2024)',
			summary:
				'§3-natur, Natura 2000, fredninger og artsbeskyttelse begrænser indsamling og habitatændringer. Tjek altid områdets og artens status før ethvert indgreb.'
		},
		{
			id: 'dk_artsfredning',
			group: 'environment',
			url: 'https://www.retsinformation.dk/eli/lta/2021/521',
			title: 'Artsfredningsbekendtgørelsen (BEK nr. 521 af 25/03/2021)',
			summary:
				'Fredede planter (bilag 2) — bl.a. kongebregne (Osmunda regalis) — må ikke plukkes, indsamles eller opgraves i naturen. Dispensation kræver myndighedstilladelse.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.arterDk,
	buildSpeciesSearchUrl: buildArterDkSpeciesSearchUrl
};
