import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildWaarnemingenBeSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Justel / Moniteur belge (SPF Justice) — textes consolidés via ELI.
 * - Code civil Livre 3 (biens) : voisinage / plantations / fruits.
 * - Forêt et nature : largement régionalisées (VL / WA / BXL).
 */
export const beLegalPack: LegalContentPack = {
	country: 'BE',
	sourceName: 'Justel',
	speciesSourceName: 'Waarnemingen.be',
	articles: [
		{
			id: 'be_cc_livre3_voisinage',
			group: 'property',
			url: 'https://www.ejustice.just.fgov.be/eli/loi/2020/02/04/2020020683/justel',
			title: 'Code civil — Livre 3 (biens) : voisinage et plantations',
			summary:
				'Le Livre 3 du Code civil règle les relations de voisinage, notamment plantations et fruits tombés. L’accès et l’enlèvement sur le fonds d’autrui restent soumis au droit de propriété et au consentement du propriétaire.'
		},
		{
			id: 'be_foret_regionale',
			group: 'forest',
			url: 'https://www.ejustice.just.fgov.be/eli/decret/2008/07/15/2008203215/justel',
			title: 'Wallonie — Code forestier',
			summary:
				'En Wallonie, le Code forestier cadre la gestion et l’accès aux forêts. Vérifier aussi les règles locales avant toute activité en forêt.'
		},
		{
			id: 'be_bosdecreet',
			group: 'forest',
			url: 'https://codex.vlaanderen.be/zoeken/Document.aspx?DID=1003183',
			title: 'Flandre — Bosdecreet',
			summary:
				'En Flandre, le Bosdecreet (décret forestier) régit la conservation, la gestion et l’usage des forêts. Contacter Agentschap voor Natuur en Bos pour les autorisations.'
		},
		{
			id: 'be_nature_especes',
			group: 'environment',
			url: 'https://www.ejustice.just.fgov.be/eli/loi/1973/07/12/1973A71207/justel',
			title: 'Conservation de la nature — cadre (loi 12 juillet 1973)',
			summary:
				'La protection des espèces et des habitats est surtout régionale (Flandre Soortenbesluit, Wallonie loi 1973 / annexes, Bruxelles ordonnance 2012). L’enlèvement de plantes sauvages peut être interdit — consulter la réglementation de la région.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.waarnemingenBe,
	buildSpeciesSearchUrl: buildWaarnemingenBeSpeciesSearchUrl
};
