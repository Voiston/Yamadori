import { buildInpnSpeciesSearchUrl, INPN_SPECIES_SEARCH_BASE } from '$lib/constants/veto-legal';
import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';

/**
 * Curated FR pack — yamadori/bonsai-relevant taxa from national protection orders
 * (e.g. arrêté 20 jan 1982) and well-known regional cases. Non-exhaustive.
 */
export const frSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'FR',
	coverage: 'full',
	sourceName: 'INPN (MNHN)',
	buildSourceUrl: buildInpnSpeciesSearchUrl,
	entries: [
		{
			id: 'fr_betula_nana',
			level: 'veto',
			scope: 'national',
			label: 'Bouleau nain (Betula nana)',
			names: ['Bouleau nain', 'Betula nana', 'Dwarf birch']
		},
		{
			id: 'fr_pinus_salzmannii',
			level: 'veto',
			scope: 'national',
			label: 'Pin de Salzmann (Pinus nigra subsp. salzmannii)',
			names: [
				'Pin de Salzmann',
				'Pinus salzmannii',
				'Pinus nigra subsp. salzmannii',
				'Pinus nigra salzmannii',
				'Salzmann pine',
				'salzmannii'
			]
		},
		{
			id: 'fr_salix_lapponum',
			level: 'veto',
			scope: 'national',
			label: 'Saule des Lapons (Salix lapponum)',
			names: ['Saule des Lapons', 'Salix lapponum', 'Downy willow']
		},
		{
			id: 'fr_salix_repens',
			level: 'caution',
			scope: 'national',
			label: 'Saule rampant (Salix repens)',
			names: ['Saule rampant', 'Salix repens', 'Creeping willow']
		},
		{
			id: 'fr_daphne',
			level: 'veto',
			scope: 'national',
			label: 'Daphné (Daphne spp.)',
			names: ['Daphné', 'Daphne', 'Daphne mezereum', 'Bois-joli', 'Daphne laureola']
		},
		{
			id: 'fr_dracocephalum',
			level: 'veto',
			scope: 'national',
			label: 'Dracocephale d’Autriche',
			names: ['Dracocephalum austriacum', 'Dracocephale']
		},
		{
			id: 'fr_osmunda',
			level: 'caution',
			scope: 'regional',
			label: 'Osmonde royale (Osmunda regalis)',
			names: ['Osmonde royale', 'Osmunda regalis', 'Royal fern']
		},
		{
			id: 'fr_ilex',
			level: 'caution',
			scope: 'regional',
			label: 'Houx (Ilex aquifolium)',
			names: ['Houx', 'Ilex aquifolium', 'Holly', 'Acebo']
		},
		{
			id: 'fr_taxus',
			level: 'caution',
			scope: 'regional',
			label: 'If (Taxus baccata)',
			names: ['If', 'Taxus baccata', 'Yew', 'Tejo', 'Eibe']
		}
	]
};

export const FR_SPECIES_SEARCH_BASE = INPN_SPECIES_SEARCH_BASE;
