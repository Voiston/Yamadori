import type { CountryCode } from '$lib/geo/countries';
import * as m from '$lib/paraglide/messages.js';

export type MapOnboardingSources = {
	/** Short display name for parcel / tenure lookup source. */
	cadastreSource: string;
	/** Short display name for protected-areas overlay / inventory. */
	protectedSource: string;
};

function fallbackSources(): MapOnboardingSources {
	return {
		cadastreSource: m.map_source_parcel_data(),
		protectedSource: m.map_source_protected_areas()
	};
}

/**
 * Short, field-facing source labels for map onboarding copy.
 * Not full legal attributions — see `attributions.ts` for those.
 */
const SOURCES: Record<CountryCode, MapOnboardingSources> = {
	FR: {
		cadastreSource: 'Cadastre IGN',
		protectedSource: 'ZNIEFF1 (Patrinat)'
	},
	ES: {
		cadastreSource: 'Catastro (SEC)',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	IT: {
		cadastreSource: 'Catasto (AdE)',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	DE: {
		cadastreSource: 'ALKIS / Geoportal.de',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	GB: {
		cadastreSource: 'HM Land Registry / OS',
		protectedSource: 'SSSI / NNR (nations)'
	},
	CH: {
		cadastreSource: 'swisstopo AV / EGRID',
		protectedSource: 'OFEV inventaires'
	},
	AT: {
		cadastreSource: 'commune / OSM',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	BE: {
		cadastreSource: 'CadGIS',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	NL: {
		cadastreSource: 'Kadaster / PDOK',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	SE: {
		cadastreSource: 'kommun / Lantmäteriet',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	NO: {
		cadastreSource: 'Kartverket matrikkel',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	US: {
		cadastreSource: 'PAD-US (public tenure)',
		protectedSource: 'PAD-US'
	},
	CA: {
		cadastreSource: 'CPCAD / Crown (partial)',
		protectedSource: 'CPCAD'
	},
	NZ: {
		cadastreSource: 'DOC PCL',
		protectedSource: 'DOC NaPALIS'
	},
	PT: {
		cadastreSource: 'DGT Cadastro Predial',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	IE: {
		cadastreSource: 'locality / OSM',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	AU: {
		cadastreSource: 'CAPAD (public tenure)',
		protectedSource: 'CAPAD'
	},
	DK: {
		cadastreSource: 'locality / OSM',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	FI: {
		cadastreSource: 'locality / OSM',
		protectedSource: 'EEA Natura 2000 / CDDA'
	},
	JP: {
		cadastreSource: 'locality / OSM',
		protectedSource: 'MOE national parks'
	}
};

export function getMapOnboardingSources(country: CountryCode | null): MapOnboardingSources {
	if (!country) return fallbackSources();
	return SOURCES[country] ?? fallbackSources();
}
