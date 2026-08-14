import { buildInpnSpeciesSearchUrl, INPN_SPECIES_SEARCH_BASE, LEGAL_ARTICLES } from '$lib/constants/veto-legal';
import type { LegalContentPack } from '$lib/geo/legal/types';

/** Wraps the existing FR constants (`$lib/constants/veto-legal`) in the shared cross-country shape. */
export const frLegalPack: LegalContentPack = {
	country: 'FR',
	sourceName: 'Légifrance',
	speciesSourceName: 'INPN (MNHN)',
	articles: LEGAL_ARTICLES.map((article) => ({
		id: article.id,
		group: article.group,
		url: article.url
	})),
	speciesSearchBase: INPN_SPECIES_SEARCH_BASE,
	buildSpeciesSearchUrl: buildInpnSpeciesSearchUrl
};
