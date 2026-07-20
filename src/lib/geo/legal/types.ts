import type { CountryCode } from '$lib/geo/countries';

export type LegalArticleGroup = 'property' | 'forest' | 'environment';

export type LegalArticleRef = {
	id: string;
	group: LegalArticleGroup;
	url: string;
	/** Plain-language title. Omitted for FR — `LegalArticleCard` already has a paraglide-translated fallback keyed by `id`. */
	title?: string;
	/** Short plain-language summary, shown alongside `title`. */
	summary?: string;
};

export type LegalContentPack = {
	country: CountryCode;
	/** Official legal gazette / database name shown in “read the text on …” links. */
	sourceName: string;
	/** Species checklist database name (INPN, GBIF, …). */
	speciesSourceName: string;
	articles: LegalArticleRef[];
	speciesSearchBase: string;
	buildSpeciesSearchUrl: (species: string) => string;
};
