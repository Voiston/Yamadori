/**
 * Indicative dormancy / collection windows for Japanese yamadori species by climate zone.
 * Months are 1–12 inclusive. Editorial guidance — not a legal or agronomic guarantee.
 */

import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';

export type JpHarvestZone = 'jp_hokkaido' | 'jp_honshu' | 'jp_kyushu_okinawa';

export type JpHarvestWindow = {
	species: string;
	aliases?: readonly string[];
	zone: JpHarvestZone;
	/** Inclusive start month (1 = January). */
	startMonth: number;
	/** Inclusive end month (12 = December). */
	endMonth: number;
	note?: string;
};

/** Coarse lat bands — Hokkaido north, Kyushu/Okinawa south, Honshu (incl. Shikoku) middle. */
export function resolveJpHarvestZone(latitude: number, longitude: number): JpHarvestZone | null {
	// Rough Japan bbox guard
	if (latitude < 24 || latitude > 46 || longitude < 122 || longitude > 146) {
		return null;
	}
	if (latitude >= 41.3) return 'jp_hokkaido';
	if (latitude < 33.5) return 'jp_kyushu_okinawa';
	return 'jp_honshu';
}

export const JP_HARVEST_CALENDAR: readonly JpHarvestWindow[] = [
	// Hokkaido — longer dormancy
	{
		species: 'Japanese black pine',
		aliases: ['Pinus thunbergii', 'Pin noir du Japon', 'クロマツ', 'Kuromatsu'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Japanese red pine',
		aliases: ['Pinus densiflora', 'Pin rouge du Japon', 'アカマツ', 'Akamatsu'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Zelkova',
		aliases: ['Zelkova serrata', 'Keyaki', 'ケヤキ'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Japanese maple',
		aliases: ['Acer palmatum', 'Érable du Japon', 'モミジ', 'Momiji'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Japanese juniper',
		aliases: ['Juniperus chinensis', 'Genévrier de Chine', 'シノブヒバ'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Japanese white pine',
		aliases: ['Pinus parviflora', 'Pin blanc du Japon', 'ゴヨウマツ', 'Goyomatsu'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	{
		species: 'Japanese beech',
		aliases: ['Fagus crenata', 'Hêtre du Japon', 'ブナ', 'Buna'],
		zone: 'jp_hokkaido',
		startMonth: 10,
		endMonth: 4
	},
	// Honshu
	{
		species: 'Japanese black pine',
		aliases: ['Pinus thunbergii', 'Pin noir du Japon', 'クロマツ', 'Kuromatsu'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Japanese red pine',
		aliases: ['Pinus densiflora', 'Pin rouge du Japon', 'アカマツ', 'Akamatsu'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Zelkova',
		aliases: ['Zelkova serrata', 'Keyaki', 'ケヤキ'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Japanese maple',
		aliases: ['Acer palmatum', 'Érable du Japon', 'モミジ', 'Momiji'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Japanese juniper',
		aliases: ['Juniperus chinensis', 'Genévrier de Chine', 'シノブヒバ'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Japanese white pine',
		aliases: ['Pinus parviflora', 'Pin blanc du Japon', 'ゴヨウマツ', 'Goyomatsu'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Japanese beech',
		aliases: ['Fagus crenata', 'Hêtre du Japon', 'ブナ', 'Buna'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	{
		species: 'Konara oak',
		aliases: ['Quercus serrata', 'Chêne konara', 'コナラ'],
		zone: 'jp_honshu',
		startMonth: 11,
		endMonth: 3
	},
	// Kyushu / Okinawa — milder, shorter window
	{
		species: 'Japanese black pine',
		aliases: ['Pinus thunbergii', 'Pin noir du Japon', 'クロマツ', 'Kuromatsu'],
		zone: 'jp_kyushu_okinawa',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Japanese red pine',
		aliases: ['Pinus densiflora', 'Pin rouge du Japon', 'アカマツ', 'Akamatsu'],
		zone: 'jp_kyushu_okinawa',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Zelkova',
		aliases: ['Zelkova serrata', 'Keyaki', 'ケヤキ'],
		zone: 'jp_kyushu_okinawa',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Japanese maple',
		aliases: ['Acer palmatum', 'Érable du Japon', 'モミジ', 'Momiji'],
		zone: 'jp_kyushu_okinawa',
		startMonth: 12,
		endMonth: 2
	},
	{
		species: 'Japanese juniper',
		aliases: ['Juniperus chinensis', 'Genévrier de Chine'],
		zone: 'jp_kyushu_okinawa',
		startMonth: 12,
		endMonth: 2
	}
];

export function findJpHarvestWindows(
	species: string,
	zone?: JpHarvestZone | null
): JpHarvestWindow[] {
	if (!species.trim()) return [];
	return JP_HARVEST_CALENDAR.filter((entry) => {
		if (!matchHarvestSpecies(species, entry.species, entry.aliases ?? [])) return false;
		if (zone && entry.zone !== zone) return false;
		return true;
	});
}

export { formatHarvestWindowMonths } from '$lib/geo/usHarvestCalendar';
