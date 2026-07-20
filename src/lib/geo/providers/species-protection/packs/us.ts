import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';

const ECOS_SEARCH = 'https://ecos.fws.gov/ecp/report/species';

/**
 * Curated US pack — yamadori-relevant taxa that may be protected federally
 * or heavily regulated. Always non-exhaustive → coverage partial.
 */
export const usSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'US',
	coverage: 'partial',
	sourceName: 'ECOS FWS',
	buildSourceUrl: (species) => {
		const q = species.trim();
		if (!q) return ECOS_SEARCH;
		return `${ECOS_SEARCH}?${new URLSearchParams({ status: 'Listed', q })}`;
	},
	entries: [
		{
			id: 'us_bristlecone',
			level: 'caution',
			scope: 'national',
			label: 'Bristlecone pine (Pinus longaeva / aristata)',
			names: [
				'Bristlecone pine',
				'Pinus longaeva',
				'Pinus aristata',
				'Pin à cônes hérissés',
				'Great Basin bristlecone'
			]
		},
		{
			id: 'us_torrey_pine',
			level: 'veto',
			scope: 'national',
			label: 'Torrey pine (Pinus torreyana)',
			names: ['Torrey pine', 'Pinus torreyana', 'Pin de Torrey']
		},
		{
			id: 'us_florida_torreya',
			level: 'veto',
			scope: 'national',
			label: 'Florida torreya (Torreya taxifolia)',
			names: ['Florida torreya', 'Torreya taxifolia', 'Stinking cedar']
		},
		{
			id: 'us_whitebark',
			level: 'caution',
			scope: 'national',
			label: 'Whitebark pine (Pinus albicaulis)',
			names: ['Whitebark pine', 'Pinus albicaulis', 'Pin à écorce blanche']
		},
		{
			id: 'us_foxtail',
			level: 'caution',
			scope: 'national',
			label: 'Foxtail pine (Pinus balfouriana)',
			names: ['Foxtail pine', 'Pinus balfouriana']
		},
		{
			id: 'us_redwood',
			level: 'caution',
			scope: 'regional',
			label: 'Coast redwood (Sequoia sempervirens)',
			names: ['Coast redwood', 'Sequoia sempervirens', 'Séquoia à feuilles d’if']
		},
		{
			id: 'us_giant_sequoia',
			level: 'caution',
			scope: 'regional',
			label: 'Giant sequoia (Sequoiadendron giganteum)',
			names: ['Giant sequoia', 'Sequoiadendron giganteum', 'Séquoia géant']
		},
		{
			id: 'us_american_chestnut',
			level: 'caution',
			scope: 'national',
			label: 'American chestnut (Castanea dentata)',
			names: ['American chestnut', 'Castanea dentata', 'Châtaignier d’Amérique']
		}
	]
};
