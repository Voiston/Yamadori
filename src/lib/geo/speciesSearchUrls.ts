/**
 * Stable public species-lookup URLs for legal packs + species-protection packs.
 * Prefer national portals over generic GBIF when available.
 */

const GBIF_BASE = 'https://www.gbif.org/species/search';
const FLORAWEB_BASE = 'https://www.floraweb.de/';
const FLORA_ON_BASE = 'https://flora-on.pt/';
const INFO_FLORA_BASE = 'https://www.infoflora.ch/fr/flore/';
const WAARNEMINGEN_BE_BASE = 'https://waarnemingen.be/species/search/';
const VERSPREIDINGSATLAS_BASE = 'https://www.verspreidingsatlas.nl/';
const ARTFAKTA_BASE = 'https://artfakta.se/taxonsearch';
/** Artsdatabanken (Norway) — hub (legacy `/Taxon/Search` 404s). */
const ARTSDATABANKEN_BASE = 'https://artsdatabanken.no/';
/** Acta Plantarum search hub (Italy). */
const ACTA_PLANTARUM_BASE = 'https://www.actaplantarum.org/cerca/cerca.php';
/** FlorItaly — Portal to the Flora of Italy (Dryades / UniTS). */
const FLORITALY_BASE = 'https://dryades.units.it/floritaly/';
const NBN_ATLAS_BASE = 'https://species.nbnatlas.org/search';
/** Biodiversitäts-Atlas Österreich — species BIE search (not FloraWeb DE). */
const BIODIVERSITY_ATLAS_AT_BASE = 'https://bie.biodiversityatlas.at/search';

export function buildGbifSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return GBIF_BASE;
	return `${GBIF_BASE}?${new URLSearchParams({ q: query })}`;
}

export function buildFloraWebSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return FLORAWEB_BASE;
	return `${FLORAWEB_BASE}pflanzenarten/artenhome.xde?type=nn&name=${encodeURIComponent(query)}`;
}

/** Flora-On (Portugal) — hash deep-link search. */
export function buildFloraOnSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return FLORA_ON_BASE;
	return `${FLORA_ON_BASE}#/q/${encodeURIComponent(query)}`;
}

/** Info Flora (Switzerland). */
export function buildInfoFloraSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return INFO_FLORA_BASE;
	return `${INFO_FLORA_BASE}search.html?${new URLSearchParams({ q: query })}`;
}

/** Waarnemingen.be (Belgium). */
export function buildWaarnemingenBeSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return WAARNEMINGEN_BE_BASE;
	return `${WAARNEMINGEN_BE_BASE}?${new URLSearchParams({ q: query })}`;
}

/** Verspreidingsatlas / NDFF (Netherlands). */
export function buildVerspreidingsatlasSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return VERSPREIDINGSATLAS_BASE;
	return `${VERSPREIDINGSATLAS_BASE}?${new URLSearchParams({ q: query })}`;
}

/** Artfakta / SLU Artdatabanken (Sweden). */
export function buildArtfaktaSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ARTFAKTA_BASE;
	return `${ARTFAKTA_BASE}?${new URLSearchParams({ query })}`;
}

/** Artsdatabanken (Norway). */
export function buildArtsdatabankenSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ARTSDATABANKEN_BASE;
	// Site search landing; deep Taxon/Search paths are no longer stable.
	return `${ARTSDATABANKEN_BASE}?${new URLSearchParams({ q: query })}`;
}

/**
 * Acta Plantarum / FlorItaly (Italy).
 * Lands on FlorItaly with a basic query string; Acta Plantarum is the companion national flora hub.
 */
export function buildActaPlantarumSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return FLORITALY_BASE;
	return `${FLORITALY_BASE}?${new URLSearchParams({ procedure: 'basic_query', query })}`;
}

/** NBN Atlas (United Kingdom). */
export function buildNbnAtlasSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return NBN_ATLAS_BASE;
	return `${NBN_ATLAS_BASE}?${new URLSearchParams({ q: query })}`;
}

/** National Biodiversity Data Centre — Biodiversity Ireland (maps search endpoint returns 500). */
const NBDC_BASE = 'https://biodiversityireland.ie/';

export function buildNbdcSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return NBDC_BASE;
	return `${NBDC_BASE}?${new URLSearchParams({ s: query })}`;
}

/** Atlas of Living Australia (Australia). */
const ALA_BASE = 'https://bie.ala.org.au/search';

export function buildAlaSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ALA_BASE;
	return `${ALA_BASE}?${new URLSearchParams({ q: query })}`;
}

/** Arter.dk — Danish species portal. */
/** Arter.dk taxa catalogue (SPA; `/search` 404s). */
const ARTER_DK_BASE = 'https://arter.dk/taxa';

export function buildArterDkSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return ARTER_DK_BASE;
	return `${ARTER_DK_BASE}?${new URLSearchParams({ q: query })}`;
}

/** Laji.fi / FinBIF (Finland). */
const LAJI_FI_BASE = 'https://laji.fi/taxon/list';

export function buildLajiFiSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return LAJI_FI_BASE;
	return `${LAJI_FI_BASE}?${new URLSearchParams({ target: query })}`;
}

/** Biodiversitäts-Atlas Österreich (Austria) — BIE species search. */
export function buildBiodiversityAtlasAtSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return BIODIVERSITY_ATLAS_AT_BASE;
	return `${BIODIVERSITY_ATLAS_AT_BASE}?${new URLSearchParams({ q: query })}`;
}

export const SPECIES_SEARCH_BASE = {
	gbif: GBIF_BASE,
	floraWeb: FLORAWEB_BASE,
	floraOn: FLORA_ON_BASE,
	infoFlora: INFO_FLORA_BASE,
	waarnemingenBe: WAARNEMINGEN_BE_BASE,
	verspreidingsatlas: VERSPREIDINGSATLAS_BASE,
	artfakta: ARTFAKTA_BASE,
	artsdatabanken: ARTSDATABANKEN_BASE,
	actaPlantarum: ACTA_PLANTARUM_BASE,
	floritaly: FLORITALY_BASE,
	nbnAtlas: NBN_ATLAS_BASE,
	biodiversityAtlasAt: BIODIVERSITY_ATLAS_AT_BASE,
	nbdc: NBDC_BASE,
	ala: ALA_BASE,
	arterDk: ARTER_DK_BASE,
	lajiFi: LAJI_FI_BASE
} as const;
