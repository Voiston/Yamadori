import { buildLegifranceSearchUrl } from './legifrance';

export type LegalArticleId =
	| 'cc_552'
	| 'cc_547'
	| 'cp_311_1'
	| 'cf_l331_2'
	| 'cf_l161_1'
	| 'ce_l411_1'
	| 'ce_l415_3';

export type LegalArticleGroup = 'property' | 'forest' | 'environment';

export type LegalArticleRef = {
	id: LegalArticleId;
	group: LegalArticleGroup;
	url: string;
};

export const LEGAL_ARTICLES: LegalArticleRef[] = [
	{
		id: 'cc_552',
		group: 'property',
		url: buildLegifranceSearchUrl('article 552 du code civil')
	},
	{
		id: 'cc_547',
		group: 'property',
		url: buildLegifranceSearchUrl('article 547 du code civil')
	},
	{
		id: 'cp_311_1',
		group: 'property',
		url: buildLegifranceSearchUrl('article 311-1 du code pénal')
	},
	{
		id: 'cf_l331_2',
		group: 'forest',
		url: buildLegifranceSearchUrl('article L331-2 du code forestier')
	},
	{
		id: 'cf_l161_1',
		group: 'forest',
		url: buildLegifranceSearchUrl('article L161-1 du code forestier')
	},
	{
		id: 'ce_l411_1',
		group: 'environment',
		url: buildLegifranceSearchUrl("article L411-1 du code de l'environnement")
	},
	{
		id: 'ce_l415_3',
		group: 'environment',
		url: buildLegifranceSearchUrl("article L415-3 du code de l'environnement")
	}
];

export const INPN_SPECIES_SEARCH_BASE =
	'https://inpn.mnhn.fr/accueil/recherche-de-donnees/especes';

export type RegionalSpeciesHintId = 'pays_de_la_loire';

/** Bounding box approximative — Pays de la Loire (incl. Nantes, Gâvre, littoral). */
const PAYS_DE_LA_LOIRE_BBOX = {
	minLat: 46.2,
	maxLat: 48.55,
	minLon: -2.65,
	maxLon: 0.95
} as const;

export function getRegionalSpeciesHint(
	latitude: number,
	longitude: number
): RegionalSpeciesHintId | null {
	if (
		latitude >= PAYS_DE_LA_LOIRE_BBOX.minLat &&
		latitude <= PAYS_DE_LA_LOIRE_BBOX.maxLat &&
		longitude >= PAYS_DE_LA_LOIRE_BBOX.minLon &&
		longitude <= PAYS_DE_LA_LOIRE_BBOX.maxLon
	) {
		return 'pays_de_la_loire';
	}
	return null;
}

export function buildInpnSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return INPN_SPECIES_SEARCH_BASE;
	const params = new URLSearchParams({ q: query });
	return `${INPN_SPECIES_SEARCH_BASE}?${params}`;
}

export function articlesForGroup(group: LegalArticleGroup): LegalArticleRef[] {
	return LEGAL_ARTICLES.filter((article) => article.group === group);
}
