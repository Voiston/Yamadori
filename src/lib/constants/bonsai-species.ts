/** Espèces yamadori/bonsaï les plus recherchées en France — ordre = priorité d'affichage. */
export const BONSAI_SPECIES_EUROPE = [
	'Pin sylvestre',
	'Genévrier commun',
	'Charme commun',
	'Hêtre commun',
	'Pin noir',
	'Pin maritime',
	'Chêne pubescent',
	'Chêne sessile',
	'Chêne pédonculé',
	'Érable sycomore',
	'If',
	'Buis',
	'Noyer',
	'Érable champêtre',
	'Bouleau',
	'Mélèze',
	'Chêne vert',
	'Pin à crochets',
	"Pin d'Alep",
	'Genévrier de Phénice',
	'Érable de Montpellier',
	'Tamaris',
	'Saule',
	'Aulne glutineux',
	'Rhododendron ferrugineux',
	'Châtaignier',
	'Cyprès',
	'Olivier',
	'Frêne',
	'Orme',
	'Tilleul',
	'Cornouiller',
	'Troène',
	'Prunellier',
	'Pommier sauvage',
	'Pin cembro'
] as const;

/** North-American yamadori favourites — after European list for search priority. */
export const BONSAI_SPECIES_US = [
	'Utah juniper',
	'Rocky Mountain juniper',
	'Ponderosa pine',
	'Bristlecone pine',
	'Eastern hemlock',
	'Red maple',
	'Coast live oak',
	'California juniper',
	'Douglas fir',
	'Lodgepole pine',
	'Quaking aspen',
	'Western larch',
	'Engelmann spruce'
] as const;

/** Canadian favourites — after US list. */
export const BONSAI_SPECIES_CA = [
	'Eastern white cedar',
	'White spruce',
	'Jack pine',
	'Sugar maple',
	'Tamarack',
	'Paper birch',
	'Yellow birch'
] as const;

/** New Zealand favourites — after CA list. */
export const BONSAI_SPECIES_NZ = [
	'Pohutukawa',
	'Mānuka',
	'Kānuka',
	'Rimu',
	'Tōtara',
	'Lancewood',
	'Southern beech',
	'Kahikatea',
	'Kauri'
] as const;

/** Portuguese favourites — after NZ list. */
export const BONSAI_SPECIES_PT = [
	'Sobreiro',
	'Azinheira',
	'Oliveira',
	'Pinheiro-bravo',
	'Medronheiro',
	'Carvalho-português'
] as const;

/** Australian favourites — after PT list. */
export const BONSAI_SPECIES_AU = [
	'Banksia',
	'Waratah',
	'Bottlebrush',
	'Sheoak',
	'Moreton Bay fig',
	'Huon pine',
	'Celery-top pine'
] as const;

/** Japanese favourites — aligned with jpHarvestCalendar / GDD catalog. */
export const BONSAI_SPECIES_JP = [
	'Japanese black pine',
	'Japanese red pine',
	'Japanese white pine',
	'Zelkova',
	'Japanese maple',
	'Japanese juniper',
	'Japanese beech',
	'Konara oak'
] as const;

export const BONSAI_SPECIES_PRIORITY = [
	...BONSAI_SPECIES_EUROPE,
	...BONSAI_SPECIES_US,
	...BONSAI_SPECIES_CA,
	...BONSAI_SPECIES_NZ,
	...BONSAI_SPECIES_PT,
	...BONSAI_SPECIES_AU,
	...BONSAI_SPECIES_JP
] as const;

const priorityIndex = new Map<string, number>(
	BONSAI_SPECIES_PRIORITY.map((name, index) => [name, index])
);

const UNKNOWN_PRIORITY = 999;

export function getBonsaiPriorityRank(name: string): number {
	return priorityIndex.get(name) ?? UNKNOWN_PRIORITY;
}
