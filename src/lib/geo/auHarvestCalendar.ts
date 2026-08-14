/**
 * Indicative dormancy / collection windows for Australian yamadori species by macro-region.
 * Months are 1–12 inclusive. Southern hemisphere — deep dormancy typically June–August.
 * Editorial guidance — not a legal or agronomic guarantee.
 */

import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';

export type AuMacroRegion =
	| 'au_nsw'
	| 'au_vic'
	| 'au_qld'
	| 'au_sa'
	| 'au_wa'
	| 'au_tas'
	| 'au_nt';

export type AuHarvestWindow = {
	species: string;
	aliases?: readonly string[];
	macroRegion: AuMacroRegion;
	/** Inclusive start month (1 = January). */
	startMonth: number;
	/** Inclusive end month (12 = December). */
	endMonth: number;
	note?: string;
};

export const AU_HARVEST_CALENDAR: readonly AuHarvestWindow[] = [
	{
		species: 'Banksia',
		aliases: ['Banksia serrata', 'Banksia integrifolia'],
		macroRegion: 'au_nsw',
		startMonth: 6,
		endMonth: 8,
		note: 'Coastal NSW — winter lift; verify CAPAD / private tenure.'
	},
	{
		species: 'Banksia',
		aliases: ['Banksia serrata', 'Banksia integrifolia'],
		macroRegion: 'au_vic',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Waratah',
		aliases: ['Telopea speciosissima'],
		macroRegion: 'au_nsw',
		startMonth: 6,
		endMonth: 8,
		note: 'Often protected — check EPBC and state flora lists.'
	},
	{
		species: 'Bottlebrush',
		aliases: ['Callistemon', 'Melaleuca'],
		macroRegion: 'au_nsw',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Bottlebrush',
		aliases: ['Callistemon', 'Melaleuca'],
		macroRegion: 'au_qld',
		startMonth: 5,
		endMonth: 8
	},
	{
		species: 'Sheoak',
		aliases: ['Allocasuarina', 'Casuarina'],
		macroRegion: 'au_sa',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Sheoak',
		aliases: ['Allocasuarina', 'Casuarina'],
		macroRegion: 'au_wa',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Huon pine',
		aliases: ['Lagarostrobos franklinii'],
		macroRegion: 'au_tas',
		startMonth: 5,
		endMonth: 9,
		note: 'Tasmania wet winters — CAPAD / Parks permits rarely granted.'
	},
	{
		species: 'Celery-top pine',
		aliases: ['Phyllocladus aspleniifolius'],
		macroRegion: 'au_tas',
		startMonth: 5,
		endMonth: 9
	},
	{
		species: 'Moreton Bay fig',
		aliases: ['Ficus macrophylla'],
		macroRegion: 'au_qld',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Moreton Bay fig',
		aliases: ['Ficus macrophylla'],
		macroRegion: 'au_nsw',
		startMonth: 6,
		endMonth: 8
	}
];

export function findAuHarvestWindows(
	species: string,
	macroRegion?: AuMacroRegion | string | null
): AuHarvestWindow[] {
	if (!species.trim()) return [];
	return AU_HARVEST_CALENDAR.filter((entry) => {
		if (!matchHarvestSpecies(species, entry.species, entry.aliases ?? [])) return false;
		if (macroRegion && entry.macroRegion !== macroRegion) return false;
		return true;
	});
}

export { formatHarvestWindowMonths } from '$lib/geo/usHarvestCalendar';
