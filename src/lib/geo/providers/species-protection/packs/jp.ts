import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';
import { JP_PERMIT_SOURCE_URLS } from '$lib/geo/legal/jpSources';

const MOE_SPECIES_BASE = JP_PERMIT_SOURCE_URLS.moeEndangeredSpecies;
const MOE_DESIGNATED = JP_PERMIT_SOURCE_URLS.moeDesignatedPlants;

/**
 * Curated Japan pack — yamadori-relevant natives / common taxa.
 * Always non-exhaustive → coverage partial.
 * Status notes are cautionary; verify 種の保存法 / park 指定植物 before any collection.
 */
export const jpSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'JP',
	coverage: 'partial',
	sourceName: 'MOE / 指定植物 / 種の保存法',
	buildSourceUrl: (species) => {
		const q = species.trim();
		if (!q) return MOE_SPECIES_BASE;
		return MOE_DESIGNATED;
	},
	entries: [
		{
			id: 'jp_kuromatsu',
			level: 'caution',
			scope: 'national',
			label: 'Japanese black pine (Pinus thunbergii) — クロマツ',
			names: ['Pinus thunbergii', 'Japanese black pine', 'クロマツ', 'kuromatsu']
		},
		{
			id: 'jp_akamatsu',
			level: 'caution',
			scope: 'national',
			label: 'Japanese red pine (Pinus densiflora) — アカマツ',
			names: ['Pinus densiflora', 'Japanese red pine', 'アカマツ', 'akamatsu']
		},
		{
			id: 'jp_momiji',
			level: 'caution',
			scope: 'national',
			label: 'Japanese maple (Acer palmatum) — モミジ / カエデ',
			names: ['Acer palmatum', 'Japanese maple', 'モミジ', 'カエデ', 'momiji']
		},
		{
			id: 'jp_keyaki',
			level: 'caution',
			scope: 'national',
			label: 'Japanese zelkova (Zelkova serrata) — ケヤキ',
			names: ['Zelkova serrata', 'Japanese zelkova', 'ケヤキ', 'keyaki']
		},
		{
			id: 'jp_tsuga',
			level: 'caution',
			scope: 'regional',
			label: 'Japanese hemlock (Tsuga diversifolia / sieboldii)',
			names: ['Tsuga diversifolia', 'Tsuga sieboldii', 'Japanese hemlock', 'ツガ']
		},
		{
			id: 'jp_hinoki',
			level: 'caution',
			scope: 'national',
			label: 'Hinoki cypress (Chamaecyparis obtusa) — ヒノキ',
			names: ['Chamaecyparis obtusa', 'Hinoki', 'ヒノキ', 'hinoki']
		},
		{
			id: 'jp_sugi',
			level: 'caution',
			scope: 'national',
			label: 'Japanese cedar (Cryptomeria japonica) — スギ',
			names: ['Cryptomeria japonica', 'Sugi', 'スギ', 'Japanese cedar']
		},
		{
			id: 'jp_goyomatsu',
			level: 'caution',
			scope: 'regional',
			label: 'Japanese white pine (Pinus parviflora) — ゴヨウマツ',
			names: ['Pinus parviflora', 'Japanese white pine', 'ゴヨウマツ', 'goyomatsu']
		},
		{
			id: 'jp_ume',
			level: 'caution',
			scope: 'regional',
			label: 'Japanese apricot (Prunus mume) — ウメ',
			names: ['Prunus mume', 'Japanese apricot', 'ウメ', 'ume']
		},
		{
			id: 'jp_shide',
			level: 'caution',
			scope: 'regional',
			label: 'Japanese hornbeam (Carpinus japonica / laxiflora)',
			names: ['Carpinus japonica', 'Carpinus laxiflora', 'シデ', 'hornbeam']
		}
	]
};
