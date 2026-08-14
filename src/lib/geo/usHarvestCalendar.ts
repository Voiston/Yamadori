import type { MacroRegion } from '$lib/constants/regions';
import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';

/**
 * Indicative dormancy / collection windows for US yamadori species by macro-region.
 * Months are 1–12 inclusive. Editorial guidance — not a legal or agronomic guarantee.
 */
export type UsHarvestWindow = {
	species: string;
	aliases?: readonly string[];
	macroRegion: MacroRegion;
	/** Inclusive start month (1 = January). */
	startMonth: number;
	/** Inclusive end month (12 = December). */
	endMonth: number;
	note?: string;
};

export const US_HARVEST_CALENDAR: readonly UsHarvestWindow[] = [
	{
		species: 'Utah juniper',
		aliases: ['Juniperus osteosperma'],
		macroRegion: 'us_southwest',
		startMonth: 11,
		endMonth: 3,
		note: 'Deep dormancy; avoid active growth and monsoon stress.'
	},
	{
		species: 'Ponderosa pine',
		aliases: ['Pinus ponderosa'],
		macroRegion: 'us_rockies',
		startMonth: 10,
		endMonth: 4,
		note: 'Prefer late fall through early spring before bud swell.'
	},
	{
		species: 'Ponderosa pine',
		aliases: ['Pinus ponderosa'],
		macroRegion: 'us_california',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Bristlecone pine',
		aliases: ['Pinus longaeva', 'Pinus aristata'],
		macroRegion: 'us_rockies',
		startMonth: 9,
		endMonth: 5,
		note: 'High elevation — short growing season; check ESA / local rules.'
	},
	{
		species: 'Rocky Mountain juniper',
		aliases: ['Juniperus scopulorum'],
		macroRegion: 'us_rockies',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Douglas fir',
		aliases: ['Pseudotsuga menziesii'],
		macroRegion: 'us_pacific_northwest',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Western larch',
		aliases: ['Larix occidentalis'],
		macroRegion: 'us_pacific_northwest',
		startMonth: 10,
		endMonth: 3
	},
	{
		species: 'Eastern hemlock',
		aliases: ['Tsuga canadensis'],
		macroRegion: 'us_appalachians',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Red maple',
		macroRegion: 'us_appalachians',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Coast live oak',
		macroRegion: 'us_california',
		startMonth: 12,
		endMonth: 2,
		note: 'Mediterranean climate — coolest wet months preferred.'
	},
	{
		species: 'California juniper',
		macroRegion: 'us_california',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'California juniper',
		macroRegion: 'us_southwest',
		startMonth: 11,
		endMonth: 3
	}
];

export function findUsHarvestWindows(
	species: string,
	macroRegion?: MacroRegion | null
): UsHarvestWindow[] {
	if (!species.trim()) return [];
	return US_HARVEST_CALENDAR.filter((entry) => {
		if (!matchHarvestSpecies(species, entry.species, entry.aliases ?? [])) return false;
		if (macroRegion && entry.macroRegion !== macroRegion) return false;
		return true;
	});
}

export function formatHarvestWindowMonths(startMonth: number, endMonth: number): string {
	const names = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec'
	];
	const start = names[Math.max(0, Math.min(11, startMonth - 1))] ?? '?';
	const end = names[Math.max(0, Math.min(11, endMonth - 1))] ?? '?';
	return `${start}–${end}`;
}
