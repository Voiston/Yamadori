/** Espèces yamadori/bonsaï les plus recherchées en France — ordre = priorité d'affichage. */
export const BONSAI_SPECIES_PRIORITY = [
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

const priorityIndex = new Map<string, number>(
	BONSAI_SPECIES_PRIORITY.map((name, index) => [name, index])
);

const UNKNOWN_PRIORITY = 999;

export function getBonsaiPriorityRank(name: string): number {
	return priorityIndex.get(name) ?? UNKNOWN_PRIORITY;
}
