/**
 * Species aliases for GDD category / evergreen resolution (normalize + Latin / local names).
 * Kept independent of harvest calendar modules to avoid import cycles with gdd ↔ agri.
 */

import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';

export type SpeciesAliasEntry = {
	canonical: string;
	aliases: readonly string[];
};

/** Curated aliases — keep in sync with harvest calendar vernaculars where useful. */
export const GDD_SPECIES_ALIASES: readonly SpeciesAliasEntry[] = [
	{
		canonical: 'Hêtre commun',
		aliases: ['Fagus sylvatica', 'Beech', 'Rotbuche', 'Faggio', 'Beuk']
	},
	{
		canonical: 'Charme commun',
		aliases: ['Carpinus betulus', 'Hornbeam', 'Hainbuche', 'Carpino bianco', 'Haagbeuk']
	},
	{
		canonical: 'Pin sylvestre',
		aliases: ['Pinus sylvestris', 'Scots pine', 'Waldkiefer', 'Pino silvestre']
	},
	{
		canonical: 'Mélèze',
		aliases: ['Larix decidua', 'European larch', 'Europäische Lärche', 'Larice']
	},
	{
		canonical: 'Olivier',
		aliases: ['Olea europaea', 'Olive', 'Olivo', 'Olivenbaum', 'Acebuche', 'Oliveira']
	},
	{
		canonical: 'Japanese black pine',
		aliases: ['Pinus thunbergii', 'Pin noir du Japon', 'Kuromatsu']
	},
	{
		canonical: 'Japanese red pine',
		aliases: ['Pinus densiflora', 'Pin rouge du Japon', 'Akamatsu']
	},
	{
		canonical: 'Japanese white pine',
		aliases: ['Pinus parviflora', 'Pin blanc du Japon', 'Goyomatsu']
	},
	{
		canonical: 'Zelkova',
		aliases: ['Zelkova serrata', 'Keyaki']
	},
	{
		canonical: 'Japanese maple',
		aliases: ['Acer palmatum', 'Érable du Japon', 'Momiji']
	},
	{
		canonical: 'Japanese beech',
		aliases: ['Fagus crenata', 'Hêtre du Japon', 'Buna']
	},
	{
		canonical: 'Japanese juniper',
		aliases: ['Juniperus chinensis', 'Genévrier de Chine']
	},
	{
		canonical: 'Ponderosa pine',
		aliases: ['Pinus ponderosa', 'Pin ponderosa']
	},
	{
		canonical: 'Utah juniper',
		aliases: ['Juniperus osteosperma']
	},
	{
		canonical: 'Douglas fir',
		aliases: ['Pseudotsuga menziesii', 'Douglas', 'Sapin de Douglas']
	},
	{
		canonical: 'Banksia',
		aliases: ['Banksia serrata', 'Banksia integrifolia']
	},
	{
		canonical: 'Southern beech',
		aliases: ['Nothofagus', 'Fuscospora', 'Hêtre austral']
	},
	{
		canonical: 'Pohutukawa',
		aliases: ['Metrosideros excelsa']
	},
	{
		canonical: 'Sugar maple',
		aliases: ['Acer saccharum', 'Érable à sucre']
	},
	{
		canonical: 'Quaking aspen',
		aliases: ['Populus tremuloides', 'Peuplier faux-tremble']
	},
	{
		canonical: 'Bristlecone pine',
		aliases: ['Pinus longaeva', 'Pinus aristata']
	},
	{
		canonical: 'Western larch',
		aliases: ['Larix occidentalis']
	},
	{
		canonical: 'Eastern hemlock',
		aliases: ['Tsuga canadensis']
	}
];

/** Resolve a free-text species to a catalog canonical name when aliases match. */
export function resolveSpeciesCanonicalName(
	query: string,
	catalogNames: Iterable<string>
): string | null {
	const trimmed = query.trim();
	if (!trimmed) return null;

	const catalog = [...catalogNames];
	for (const name of catalog) {
		if (matchHarvestSpecies(trimmed, name)) return name;
	}

	for (const entry of GDD_SPECIES_ALIASES) {
		if (matchHarvestSpecies(trimmed, entry.canonical, entry.aliases)) {
			for (const name of catalog) {
				if (matchHarvestSpecies(entry.canonical, name)) return name;
			}
			return entry.canonical;
		}
	}

	return null;
}

export function getSpeciesGddAliasEntries(): readonly SpeciesAliasEntry[] {
	return GDD_SPECIES_ALIASES;
}
