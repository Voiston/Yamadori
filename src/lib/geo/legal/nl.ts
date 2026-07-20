import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildVerspreidingsatlasSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * wetten.overheid.nl — official consolidated Dutch statutes (BWB).
 * Nabuurrecht / property, forest access, and nature protection under Omgevingswet.
 */
export const nlLegalPack: LegalContentPack = {
	country: 'NL',
	sourceName: 'wetten.overheid.nl',
	speciesSourceName: 'Verspreidingsatlas',
	articles: [
		{
			id: 'nl_bw_nabuurrecht',
			group: 'property',
			url: 'https://wetten.overheid.nl/BWBR0002656/2024-01-01/#Boek5_Titeldeel4',
			title: 'Burgerlijk Wetboek Boek 5 — Nabuurrecht',
			summary:
				'Regels over eigendom, burenrecht en beplantingen. Het betreden of weghalen van planten op andermans grond vereist toestemming van de eigenaar, behoudens wettelijke uitzonderingen.'
		},
		{
			id: 'nl_boswet_toegang',
			group: 'forest',
			url: 'https://wetten.overheid.nl/BWBR0009653',
			title: 'Boswet / opvolgende bosregelgeving — toegang tot bos',
			summary:
				'Toegang tot bossen en natuurterreinen is vaak beperkt door de eigenaar of beheerder. Openstelling en regels verschillen per terrein — lokale borden en verordeningen raadplegen.'
		},
		{
			id: 'nl_omgevingswet_natuur',
			group: 'environment',
			url: 'https://wetten.overheid.nl/BWBR0037885',
			title: 'Omgevingswet — natuur en soortenbescherming',
			summary:
				'Beschermde soorten en gebieden vallen onder de Omgevingswet en aanvullende regels. Het plukken of uitgraven van beschermde planten kan strafbaar zijn — check de actuele status op wetten.overheid.nl.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.verspreidingsatlas,
	buildSpeciesSearchUrl: buildVerspreidingsatlasSpeciesSearchUrl
};
