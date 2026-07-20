/**
 * Indicative dormancy / collection windows for New Zealand yamadori species by macro-region.
 * Months are 1–12 inclusive. Southern hemisphere — deep dormancy typically June–August.
 * Editorial guidance — not a legal or agronomic guarantee.
 */

export type NzMacroRegion =
	| 'nz_northland'
	| 'nz_central_ni'
	| 'nz_wellington'
	| 'nz_nelson'
	| 'nz_west_coast'
	| 'nz_canterbury'
	| 'nz_otago';

export type NzHarvestWindow = {
	species: string;
	macroRegion: NzMacroRegion;
	/** Inclusive start month (1 = January). */
	startMonth: number;
	/** Inclusive end month (12 = December). */
	endMonth: number;
	note?: string;
};

export const NZ_HARVEST_CALENDAR: readonly NzHarvestWindow[] = [
	{
		species: 'Pohutukawa',
		macroRegion: 'nz_northland',
		startMonth: 6,
		endMonth: 8,
		note: 'Coastal north — lift in winter dormancy; verify private vs DOC PCL.'
	},
	{
		species: 'Mānuka',
		macroRegion: 'nz_northland',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Mānuka',
		macroRegion: 'nz_central_ni',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Kānuka',
		macroRegion: 'nz_central_ni',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Kānuka',
		macroRegion: 'nz_wellington',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Rimu',
		macroRegion: 'nz_west_coast',
		startMonth: 5,
		endMonth: 9,
		note: 'West Coast wet winters — confirm DOC status; rarely authorised.'
	},
	{
		species: 'Tōtara',
		macroRegion: 'nz_central_ni',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Tōtara',
		macroRegion: 'nz_canterbury',
		startMonth: 5,
		endMonth: 9
	},
	{
		species: 'Lancewood',
		macroRegion: 'nz_wellington',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Lancewood',
		macroRegion: 'nz_nelson',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Southern beech',
		macroRegion: 'nz_nelson',
		startMonth: 5,
		endMonth: 9
	},
	{
		species: 'Southern beech',
		macroRegion: 'nz_west_coast',
		startMonth: 5,
		endMonth: 9
	},
	{
		species: 'Southern beech',
		macroRegion: 'nz_otago',
		startMonth: 5,
		endMonth: 9
	},
	{
		species: 'Kahikatea',
		macroRegion: 'nz_west_coast',
		startMonth: 6,
		endMonth: 8
	},
	{
		species: 'Kahikatea',
		macroRegion: 'nz_canterbury',
		startMonth: 6,
		endMonth: 8
	}
];

export function findNzHarvestWindows(
	species: string,
	macroRegion?: NzMacroRegion | string | null
): NzHarvestWindow[] {
	const normalized = species.trim().toLowerCase();
	if (!normalized) return [];
	return NZ_HARVEST_CALENDAR.filter((entry) => {
		if (entry.species.toLowerCase() !== normalized) return false;
		if (macroRegion && entry.macroRegion !== macroRegion) return false;
		return true;
	});
}

export { formatHarvestWindowMonths } from '$lib/geo/usHarvestCalendar';
