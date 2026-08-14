import type { LegalContentPack } from '$lib/geo/legal/types';

const SARA_PORTAL =
	'https://www.canada.ca/en/environment-climate-change/services/species-risk-public-registry.html';
const SARA_REGISTRY = 'https://species-registry.canada.ca/index-en.html#/species';

function buildSpeciesSearchUrl(species: string): string {
	const query = species.trim();
	if (!query) return SARA_PORTAL;
	return `${SARA_REGISTRY}?${new URLSearchParams({ sortBy: 'commonNameSort', sortDirection: 'asc', pageSize: '10', keywords: query })}`;
}

/**
 * Canada legal content pack — federal framework + provincial Crown reminder.
 * Rules vary by province/territory; articles are indicative links.
 */
export const caLegalPack: LegalContentPack = {
	country: 'CA',
	sourceName: 'Parks Canada / ECCC / provincial Crown',
	speciesSourceName: 'SARA / COSEWIC',
	articles: [
		{
			id: 'ca_private_property',
			group: 'property',
			url: 'https://www.justice.gc.ca/eng/csj-sjc/just/06.html',
			title: 'Private property & trespass',
			summary:
				'On private land, collecting or uprooting plants requires the landowner’s permission. Trespass rules are largely provincial — verify the province or territory.'
		},
		{
			id: 'ca_crown_forests',
			group: 'forest',
			url: 'https://natural-resources.canada.ca/forests-forestry/sustainable-forest-management/canada-s-forest-laws',
			title: 'Crown land & provincial forest law',
			summary:
				'Much of Canada’s forest is provincial Crown land. Collecting or transplanting trees typically requires authorization from the province or territory — CPCAD does not map all Crown land.'
		},
		{
			id: 'ca_national_parks',
			group: 'environment',
			url: 'https://laws-lois.justice.gc.ca/eng/acts/n-14.01/',
			title: 'Canada National Parks Act',
			summary:
				'Removing, digging, or damaging plants in national parks administered by Parks Canada is prohibited.'
		},
		{
			id: 'ca_sara',
			group: 'environment',
			url: SARA_PORTAL,
			title: 'Species at Risk Act (SARA)',
			summary:
				'Federally listed species at risk are protected. Provincial lists may add further restrictions. Always verify the species before collecting.'
		}
	],
	speciesSearchBase: SARA_REGISTRY,
	buildSpeciesSearchUrl
};
