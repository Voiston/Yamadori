import type { CountryCode } from '$lib/geo/countries';
import { getMapProvider } from '$lib/geo/providers/map/registry';

const EEA_PROTECTED_AREAS_ATTRIBUTION = '© EEA — Natura 2000 / Nationally designated areas (CDDA)';

/** `null` = no reliable source wired yet (UI should hide the credit line, not fabricate one). */
const PROTECTED_AREAS_ATTRIBUTIONS: Record<CountryCode, string | null> = {
	FR: '© IGN / Patrinat — ZNIEFF1',
	ES: EEA_PROTECTED_AREAS_ATTRIBUTION,
	IT: EEA_PROTECTED_AREAS_ATTRIBUTION,
	DE: EEA_PROTECTED_AREAS_ATTRIBUTION,
	GB: '© Natural England / NatureScot / NRW / NIEA — SSSI, ASSI, NNR & National Parks (OGL)',
	CH: '© OFEV / swisstopo / Pro Natura — inventaires fédéraux ; ZH open data si applicable',
	AT: EEA_PROTECTED_AREAS_ATTRIBUTION,
	BE: EEA_PROTECTED_AREAS_ATTRIBUTION,
	NL: EEA_PROTECTED_AREAS_ATTRIBUTION,
	SE: EEA_PROTECTED_AREAS_ATTRIBUTION,
	NO: EEA_PROTECTED_AREAS_ATTRIBUTION,
	US: '© USGS — Protected Areas Database of the United States (PAD-US)',
	CA: '© ECCC — Canadian Protected and Conserved Areas Database (CPCAD)',
	NZ: '© DOC — Public Conservation Areas (NaPALIS)',
	PT: EEA_PROTECTED_AREAS_ATTRIBUTION,
	IE: EEA_PROTECTED_AREAS_ATTRIBUTION,
	DK: EEA_PROTECTED_AREAS_ATTRIBUTION,
	FI: EEA_PROTECTED_AREAS_ATTRIBUTION,
	AU: '© DCCEEW — Collaborative Australian Protected Areas Database (CAPAD)',
	JP: '© MOE — national park zones (政府標準利用規約); optional KSJ A10 © MLIT'
};

const CADASTRE_ATTRIBUTIONS: Record<CountryCode, string | null> = {
	FR: '© IGN — Cadastre (PCI vecteur)',
	ES: '© Dirección General del Catastro (España)',
	IT: '© Agenzia delle Entrate — Catasto (CC BY 4.0)',
	DE: '© GeoBasis-DE / Länder — ALKIS Open Data (BE, MV, ST, HH, HB, NRW, BW, RP — partial)',
	GB: '© HM Land Registry / Ordnance Survey — INSPIRE Index (OGL); England & Wales',
	CH: '© swisstopo — AV/EGRID fédéral ; enrichissement cantonal ZH/BS (AV WFS) si applicable',
	AT: '© Nominatim/OSM — commune (BEV parcel point-query not free without registration)',
	BE: '© SPF Finances — CadGIS / INSPIRE Cadastral Parcels',
	NL: '© Kadaster / PDOK — BRK Kadastrale kaart (CC BY 4.0)',
	SE: '© Nominatim/OSM — kommun (Lantmäteriet parcel API needs account)',
	NO: '© Kartverket — Eiendom / matrikkel (open API, no owner)',
	US: '© USGS — PAD-US Fee Managers (public land tenure; no private parcels)',
	CA: '© ECCC — CPCAD (protected areas; Crown land not fully mapped nationally)',
	NZ: '© DOC — Public Conservation Land (PCL); not all Crown / private land',
	PT: '© DGT — Cadastro Predial / SNIC (coverage partial; CC BY 4.0)',
	IE: '© Nominatim/OSM — locality / county (Tailte Éireann parcels not free without registration)',
	DK: '© Nominatim/OSM — locality / kommune (Matriklen / Datafordeler needs API key)',
	FI: '© Nominatim/OSM — locality / kunta (Maanmittauslaitos kiinteistö needs API key)',
	AU: '© DCCEEW — CAPAD protected areas (public tenure; not private parcels)',
	JP: '© Nominatim/OSM — locality / 市町村 (登記 / 地番 not free for field apps)'
};

/** Basemap ("plan") tile attribution, delegating to the map provider registry so tile URLs stay the single source of truth. */
export function getBasemapAttribution(country: CountryCode | null): string {
	return getMapProvider(country).plan.attribution;
}

/** Aerial/orthophoto tile attribution for the given country. */
export function getOrthoAttribution(country: CountryCode | null): string {
	return getMapProvider(country).ortho.attribution;
}

/** Protected-areas data source attribution; `null` where no provider is wired. */
export function getProtectedAreasAttribution(country: CountryCode | null): string | null {
	if (!country) return null;
	return PROTECTED_AREAS_ATTRIBUTIONS[country];
}

/** Cadastre data source attribution; `null` where no provider is wired (DE/GB — see `providers/cadastre`). */
export function getCadastreAttribution(country: CountryCode | null): string | null {
	if (!country) return null;
	return CADASTRE_ATTRIBUTIONS[country];
}

/** All attribution strings relevant to a country's map/legal UI, de-duplicated, in display order. */
export function getAllAttributions(country: CountryCode | null): string[] {
	const values = [
		getBasemapAttribution(country),
		getOrthoAttribution(country),
		getProtectedAreasAttribution(country),
		getCadastreAttribution(country)
	].filter((value): value is string => Boolean(value));

	return Array.from(new Set(values));
}
