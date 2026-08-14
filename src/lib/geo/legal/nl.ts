import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildVerspreidingsatlasSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * wetten.overheid.nl / IPLO — Dutch law after Omgevingswet (2024).
 * - BW Boek 5 nabuurrecht: ownership / neighbour planting rules.
 * - Boswet and Wet natuurbescherming are repealed; woodland felling rules live in
 *   Bal afdeling 11.3 (melding / herplant) — documented via IPLO.
 * - Omgevingswet: species & area protection + algemene zorgplicht.
 */
export const nlLegalPack: LegalContentPack = {
	country: 'NL',
	sourceName: 'wetten.overheid.nl / IPLO',
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
			id: 'nl_iplo_houtopstanden',
			group: 'forest',
			url: 'https://iplo.nl/regelgeving/regels-voor-activiteiten/activiteiten-natuur/vellen-houtopstand-herbeplanten/rijksregels-vellen-houtopstand-herbeplanten/',
			title: 'IPLO — vellen houtopstand & herbeplanten (Bal 11.3)',
			summary:
				'Buiten de bebouwingscontour houtkap gelden rijksregels (melding, herplant). Openstelling van bos ≠ recht tot uitgraven. Provincie is vaak bevoegd gezag — check Omgevingsloket / provincie.'
		},
		{
			id: 'nl_omgevingswet_natuur',
			group: 'environment',
			url: 'https://wetten.overheid.nl/BWBR0037885',
			title: 'Omgevingswet — natuur en soortenbescherming',
			summary:
				'Soorten- en gebiedsbescherming vallen onder de Omgevingswet (ex-Wet natuurbescherming). Algemene zorgplicht geldt voor in het wild levende planten; beschermde soorten vragen een flora-fauna-toets / vergunning via RVO of bevoegd gezag.'
		},
		{
			id: 'nl_rvo_flora_fauna',
			group: 'environment',
			url: 'https://www.rvo.nl/onderwerpen/buiten-werken/omgevingsvergunning-flora-en-fauna',
			title: 'RVO — omgevingsvergunning flora- en fauna-activiteiten',
			summary:
				'Startpunt voor wanneer een omgevingsvergunning nodig is bij werkzaamheden die beschermde soorten kunnen schaden. Aanvraag via Omgevingsloket; gedragscodes kunnen vrijstellen.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.verspreidingsatlas,
	buildSpeciesSearchUrl: buildVerspreidingsatlasSpeciesSearchUrl
};
