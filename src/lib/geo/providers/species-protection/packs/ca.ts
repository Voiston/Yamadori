import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';

const SARA_REGISTRY =
	'https://species-registry.canada.ca/index-en.html#/species';
const SARA_PORTAL =
	'https://www.canada.ca/en/environment-climate-change/services/species-risk-public-registry.html';

/**
 * Curated Canada pack — SARA / provincially sensitive yamadori-relevant taxa.
 * Always non-exhaustive → coverage partial.
 */
export const caSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'CA',
	coverage: 'partial',
	sourceName: 'SARA / COSEWIC',
	buildSourceUrl: (species) => {
		const q = species.trim();
		if (!q) return SARA_PORTAL;
		return `${SARA_REGISTRY}?${new URLSearchParams({ sortBy: 'commonNameSort', sortDirection: 'asc', pageSize: '10', keywords: q })}`;
	},
	entries: [
		{
			id: 'ca_american_chestnut',
			level: 'veto',
			scope: 'national',
			label: 'American chestnut (Castanea dentata)',
			names: ['American chestnut', 'Castanea dentata', 'Châtaignier d’Amérique']
		},
		{
			id: 'ca_butternut',
			level: 'veto',
			scope: 'national',
			label: 'Butternut (Juglans cinerea)',
			names: ['Butternut', 'Juglans cinerea', 'Noyer cendré']
		},
		{
			id: 'ca_whitebark',
			level: 'veto',
			scope: 'national',
			label: 'Whitebark pine (Pinus albicaulis)',
			names: ['Whitebark pine', 'Pinus albicaulis', 'Pin à écorce blanche']
		},
		{
			id: 'ca_limber',
			level: 'caution',
			scope: 'regional',
			label: 'Limber pine (Pinus flexilis)',
			names: ['Limber pine', 'Pinus flexilis', 'Pin flexible']
		},
		{
			id: 'ca_cherry_birch',
			level: 'caution',
			scope: 'national',
			label: 'Cherry birch (Betula lenta)',
			names: ['Cherry birch', 'Betula lenta', 'Bouleau flexible']
		},
		{
			id: 'ca_kentucky_coffee',
			level: 'caution',
			scope: 'national',
			label: 'Kentucky coffee-tree (Gymnocladus dioicus)',
			names: ['Kentucky coffee-tree', 'Gymnocladus dioicus', 'Chicot févier']
		},
		{
			id: 'ca_eastern_flowering_dogwood',
			level: 'veto',
			scope: 'national',
			label: 'Eastern flowering dogwood (Cornus florida)',
			names: ['Eastern flowering dogwood', 'Cornus florida', 'Cornouiller fleuri']
		},
		{
			id: 'ca_red_mulberry',
			level: 'veto',
			scope: 'national',
			label: 'Red mulberry (Morus rubra)',
			names: ['Red mulberry', 'Morus rubra', 'Mûrier rouge']
		}
	]
};
