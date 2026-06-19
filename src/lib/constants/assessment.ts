import type {
	BarkType,
	Caliber,
	DeadwoodType,
	NebariType,
	SizeClass
} from '$lib/types/tree';

export const NEARI_OPTIONS: { value: NebariType; label: string }[] = [
	{ value: 'plat_rayonnant', label: 'Plat / Rayonnant' },
	{ value: 'unilateral_asymetrique', label: 'Unilatéral / Asymétrique' },
	{ value: 'enroche_fissure', label: 'Enroché / Fissure' }
];

export const BARK_OPTIONS: { value: BarkType; label: string }[] = [
	{ value: 'lisse_jeune', label: 'Lisse / Jeune' },
	{ value: 'ecaillee_mature', label: 'Écaillée / Mature' },
	{ value: 'cretelee_profonde', label: 'Crételée / Profonde' }
];

export const DEADWOOD_OPTIONS: { value: DeadwoodType; label: string }[] = [
	{ value: 'aucun', label: 'Aucun' },
	{ value: 'jin', label: 'Jin (branches)' },
	{ value: 'shari', label: 'Shari (tronc)' },
	{ value: 'sabamiki', label: 'Sabamiki (creux)' }
];

export const SIZE_OPTIONS: { value: SizeClass; label: string }[] = [
	{ value: 'shohin', label: 'Shohin (<25 cm)' },
	{ value: 'chuhin', label: 'Chūhin (25–45 cm)' },
	{ value: 'dai', label: 'Dai (>45 cm)' }
];

export const CALIBER_OPTIONS: { value: Caliber; label: string }[] = [
	{ value: 'fronde', label: 'Frondé' },
	{ value: 'poignet', label: 'Poignet' },
	{ value: 'canette', label: 'Canette' },
	{ value: 'cuisse', label: 'Cuisse' }
];

export const SIZE_CLASS_ORDER: Record<SizeClass, number> = {
	shohin: 0,
	chuhin: 1,
	dai: 2
};

export const CALIBER_ORDER: Record<Caliber, number> = {
	fronde: 0,
	poignet: 1,
	canette: 2,
	cuisse: 3
};

export function getAssessmentSummary(assessment: import('$lib/types/tree').TreeAssessment): string {
	const parts: string[] = [];

	if (assessment.sizeClass) {
		const label = SIZE_OPTIONS.find((o) => o.value === assessment.sizeClass)?.label.split(' ')[0];
		if (label) parts.push(label);
	}
	if (assessment.potentialScore !== null) {
		parts.push(`${assessment.potentialScore}/10`);
	}
	if (assessment.deadwood && assessment.deadwood !== 'aucun') {
		const label = DEADWOOD_OPTIONS.find((o) => o.value === assessment.deadwood)?.label.split(' ')[0];
		if (label) parts.push(label);
	}

	return parts.join(' · ');
}
