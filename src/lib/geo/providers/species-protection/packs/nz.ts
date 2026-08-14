import type { SpeciesProtectionPack } from '$lib/geo/providers/species-protection/types';

const NZPCN_FLORA = 'https://www.nzpcn.org.nz/flora/';

/**
 * Curated New Zealand pack — natives with collecting / disease / legal sensitivity.
 * Always non-exhaustive → coverage partial.
 */
export const nzSpeciesProtectionPack: SpeciesProtectionPack = {
	country: 'NZ',
	coverage: 'partial',
	sourceName: 'NZPCN / NZTCS / DOC',
	buildSourceUrl: (species) => {
		const q = species.trim();
		if (!q) return NZPCN_FLORA;
		return `${NZPCN_FLORA}?${new URLSearchParams({ SearchText: q })}`;
	},
	entries: [
		{
			id: 'nz_kauri',
			level: 'veto',
			scope: 'national',
			label: 'Kauri (Agathis australis) — dieback / high protection',
			names: ['Kauri', 'Agathis australis', 'New Zealand kauri']
		},
		{
			id: 'nz_pohutukawa',
			level: 'caution',
			scope: 'national',
			label: 'Pohutukawa (Metrosideros excelsa)',
			names: ['Pohutukawa', 'Metrosideros excelsa', 'New Zealand Christmas tree']
		},
		{
			id: 'nz_rata',
			level: 'caution',
			scope: 'national',
			label: 'Rātā / Metrosideros spp.',
			names: [
				'Northern rata',
				'Southern rata',
				'Metrosideros robusta',
				'Metrosideros umbellata',
				'Rata'
			]
		},
		{
			id: 'nz_rimu',
			level: 'caution',
			scope: 'national',
			label: 'Rimu (Dacrydium cupressinum)',
			names: ['Rimu', 'Dacrydium cupressinum']
		},
		{
			id: 'nz_totara',
			level: 'caution',
			scope: 'national',
			label: 'Tōtara (Podocarpus totara)',
			names: ['Totara', 'Tōtara', 'Podocarpus totara']
		},
		{
			id: 'nz_miro',
			level: 'caution',
			scope: 'national',
			label: 'Miro (Prumnopitys ferruginea)',
			names: ['Miro', 'Prumnopitys ferruginea']
		},
		{
			id: 'nz_kahikatea',
			level: 'caution',
			scope: 'national',
			label: 'Kahikatea (Dacrycarpus dacrydioides)',
			names: ['Kahikatea', 'Dacrycarpus dacrydioides', 'White pine']
		},
		{
			id: 'nz_mountain_beech',
			level: 'caution',
			scope: 'regional',
			label: 'Mountain beech (Fuscospora cliffortioides)',
			names: ['Mountain beech', 'Fuscospora cliffortioides', 'Nothofagus cliffortioides']
		}
	]
};
