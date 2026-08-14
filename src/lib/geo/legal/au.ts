import type { LegalContentPack } from '$lib/geo/legal/types';
import {
	buildAlaSpeciesSearchUrl,
	SPECIES_SEARCH_BASE
} from '$lib/geo/speciesSearchUrls';

/**
 * Australia legal content pack — EPBC, state parks, private property.
 * Articles are indicative starting points, not legal advice.
 */
export const auLegalPack: LegalContentPack = {
	country: 'AU',
	sourceName: 'EPBC / DCCEEW',
	speciesSourceName: 'ALA / EPBC',
	articles: [
		{
			id: 'au_private_property',
			group: 'property',
			url: 'https://legislation.nsw.gov.au/view/html/inforce/current/act-1901-033',
			title: 'Private property & trespass',
			summary:
				'On private land, collecting or uprooting plants requires the landowner’s permission. Trespass and property laws are largely state and territory based (e.g. NSW Inclosed Lands Protection Act) — verify locally.'
		},
		{
			id: 'au_epbc',
			group: 'environment',
			url: 'https://www.legislation.gov.au/C2004A00485/latest',
			title: 'EPBC Act 1999',
			summary:
				'The Environment Protection and Biodiversity Conservation Act 1999 protects listed threatened species and ecological communities. Taking protected plants without authority can be an offence.'
		},
		{
			id: 'au_national_parks',
			group: 'forest',
			url: 'https://parksaustralia.gov.au/',
			title: 'Commonwealth parks & state conservation reserves',
			summary:
				'Parks Australia manages Commonwealth parks. Most CAPAD reserves are state or territory managed — collecting plants without a permit from the relevant agency is prohibited and rarely granted for yamadori.'
		},
		{
			id: 'au_native_flora',
			group: 'environment',
			url: 'https://www.dcceew.gov.au/environment/biodiversity',
			title: 'Native flora & state biodiversity laws',
			summary:
				'States and territories regulate native vegetation clearing and protected flora. Always verify species and land status before any collection.'
		}
	],
	speciesSearchBase: SPECIES_SEARCH_BASE.ala,
	buildSpeciesSearchUrl: buildAlaSpeciesSearchUrl
};
