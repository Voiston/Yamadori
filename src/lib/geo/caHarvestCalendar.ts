/**
 * Indicative dormancy / collection windows for Canadian yamadori species by macro-region.
 * Months are 1–12 inclusive. Editorial guidance — not a legal or agronomic guarantee.
 *
 * Macro-region ids match BIOTOPE_REGIONS entries in regions.ts.
 */

import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';

export type CaMacroRegion =
	| 'ca_bc_coast'
	| 'ca_bc_interior'
	| 'ca_rockies'
	| 'ca_prairies'
	| 'ca_boreal'
	| 'ca_quebec'
	| 'ca_maritimes';

export type CaHarvestWindow = {
	species: string;
	aliases?: readonly string[];
	macroRegion: CaMacroRegion;
	/** Inclusive start month (1 = January). */
	startMonth: number;
	/** Inclusive end month (12 = December). */
	endMonth: number;
	note?: string;
};

export const CA_HARVEST_CALENDAR: readonly CaHarvestWindow[] = [
	{
		species: 'Douglas fir',
		aliases: ['Pseudotsuga menziesii'],
		macroRegion: 'ca_bc_coast',
		startMonth: 11,
		endMonth: 3,
		note: 'Coastal mild winters — lift in deep dormancy before bud swell.'
	},
	{
		species: 'Douglas fir',
		aliases: ['Pseudotsuga menziesii'],
		macroRegion: 'ca_bc_interior',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Lodgepole pine',
		macroRegion: 'ca_bc_interior',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Lodgepole pine',
		macroRegion: 'ca_rockies',
		startMonth: 9,
		endMonth: 5,
		note: 'High elevation — short season; confirm provincial rules.'
	},
	{
		species: 'Lodgepole pine',
		macroRegion: 'ca_boreal',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Ponderosa pine',
		macroRegion: 'ca_bc_interior',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Engelmann spruce',
		macroRegion: 'ca_rockies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Western larch',
		macroRegion: 'ca_bc_interior',
		startMonth: 10,
		endMonth: 3
	},
	{
		species: 'Western larch',
		macroRegion: 'ca_rockies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Rocky Mountain juniper',
		macroRegion: 'ca_rockies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Quaking aspen',
		macroRegion: 'ca_prairies',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Quaking aspen',
		macroRegion: 'ca_boreal',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Red maple',
		macroRegion: 'ca_quebec',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Red maple',
		macroRegion: 'ca_maritimes',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Eastern hemlock',
		macroRegion: 'ca_maritimes',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Eastern hemlock',
		macroRegion: 'ca_quebec',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Eastern white cedar',
		macroRegion: 'ca_quebec',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Eastern white cedar',
		macroRegion: 'ca_maritimes',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'White spruce',
		macroRegion: 'ca_prairies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'White spruce',
		macroRegion: 'ca_boreal',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Jack pine',
		macroRegion: 'ca_prairies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Jack pine',
		macroRegion: 'ca_boreal',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Sugar maple',
		macroRegion: 'ca_quebec',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Tamarack',
		macroRegion: 'ca_boreal',
		startMonth: 10,
		endMonth: 3
	},
	{
		species: 'Paper birch',
		macroRegion: 'ca_boreal',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Paper birch',
		macroRegion: 'ca_maritimes',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Yellow birch',
		macroRegion: 'ca_quebec',
		startMonth: 11,
		endMonth: 3
	}
];

export function findCaHarvestWindows(
	species: string,
	macroRegion?: CaMacroRegion | string | null
): CaHarvestWindow[] {
	if (!species.trim()) return [];
	return CA_HARVEST_CALENDAR.filter((entry) => {
		if (!matchHarvestSpecies(species, entry.species, entry.aliases ?? [])) return false;
		if (macroRegion && entry.macroRegion !== macroRegion) return false;
		return true;
	});
}

export { formatHarvestWindowMonths } from '$lib/geo/usHarvestCalendar';
