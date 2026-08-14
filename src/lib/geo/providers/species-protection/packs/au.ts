import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';
import { buildAlaSpeciesSearchUrl } from '$lib/geo/speciesSearchUrls';

/**
 * Curated Australia pack — natives with collecting / EPBC sensitivity.
 * Always non-exhaustive → coverage partial.
 */
export const auSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'AU',
	coverage: 'partial',
	sourceName: 'ALA / EPBC',
	buildSourceUrl: buildAlaSpeciesSearchUrl,
	entries: [
		{
			id: 'au_wollemi_pine',
			level: 'veto',
			scope: 'national',
			label: 'Wollemi pine (Wollemia nobilis) — critically protected',
			names: ['Wollemi pine', 'Wollemia nobilis']
		},
		{
			id: 'au_huon_pine',
			level: 'caution',
			scope: 'regional',
			label: 'Huon pine (Lagarostrobos franklinii)',
			names: ['Huon pine', 'Lagarostrobos franklinii']
		},
		{
			id: 'au_celery_top',
			level: 'caution',
			scope: 'regional',
			label: 'Celery-top pine (Phyllocladus aspleniifolius)',
			names: ['Celery-top pine', 'Phyllocladus aspleniifolius']
		},
		{
			id: 'au_banksia',
			level: 'caution',
			scope: 'national',
			label: 'Banksia spp. — many EPBC-listed taxa',
			names: ['Banksia', 'Banksia serrata', 'Banksia integrifolia', 'Coast banksia']
		},
		{
			id: 'au_waratah',
			level: 'caution',
			scope: 'regional',
			label: 'Waratah (Telopea speciosissima)',
			names: ['Waratah', 'Telopea speciosissima', 'NSW waratah']
		},
		{
			id: 'au_bottlebrush',
			level: 'caution',
			scope: 'regional',
			label: 'Bottlebrush (Callistemon / Melaleuca)',
			names: ['Bottlebrush', 'Callistemon', 'Melaleuca', 'Callistemon citrinus']
		},
		{
			id: 'au_fig',
			level: 'caution',
			scope: 'regional',
			label: 'Moreton Bay fig (Ficus macrophylla)',
			names: ['Moreton Bay fig', 'Ficus macrophylla', 'Port Jackson fig', 'Ficus rubiginosa']
		},
		{
			id: 'au_sheoak',
			level: 'caution',
			scope: 'regional',
			label: 'Sheoak / Casuarina spp.',
			names: ['Sheoak', 'Casuarina', 'Allocasuarina', 'Casuarina equisetifolia']
		}
	]
};
