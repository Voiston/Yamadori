import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildWaarnemingenBeSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Justel / Moniteur belge (SPF Justice) — textes consolidés via ELI.
 * - Code civil Livre 3 (biens) : voisinage / plantations / fruits.
 * - Forêt et nature : largement régionalisées (VL / WA / BXL) — liens Justel
 *   + renvoi aux décrets régionaux.
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
			title: 'Forêt — compétences régionales (ex. Code forestier wallon)',
			summary:
				'La gestion et l’accès aux forêts sont surtout régionaux (Wallonie, Flandre, Bruxelles). Vérifier le décret ou le code forestier de la région concernée avant toute activité en forêt.'
		},
		{
			id: 'be_nature_especes',
			group: 'environment',
			url: 'https://www.ejustice.just.fgov.be/cgi_loi/loi_a1.pl?language=fr&caller=list&cn=1973011031&table_name=loi&F=&fromtab=loi&la=F&sql=dt+%3D+%27loi%27+and+pd+%3D+1973-01-10',
			title: 'Conservation de la nature — cadre fédéral / régional',
			summary:
				'La protection des espèces et des habitats est partagée entre fédéral et régions. L’enlèvement de plantes sauvages peut être interdit en zone protégée ou pour les espèces protégées — consulter la réglementation régionale applicable.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.waarnemingenBe,
	buildSpeciesSearchUrl: buildWaarnemingenBeSpeciesSearchUrl
};
