import * as m from '$lib/paraglide/messages.js';
import type {
	BarkType,
	Caliber,
	CernageStatus,
	DeadwoodType,
	NebariType,
	SizeClass
} from '$lib/types/tree';
import type { PhenologyStageId } from '$lib/types/gdd';
import { getPhenologyStages } from '$lib/constants/gdd-config';

export function getNebariOptions(): { value: NebariType; label: string }[] {
	return [
		{ value: 'plat_rayonnant', label: m.nebari_plat_rayonnant() },
		{ value: 'unilateral_asymetrique', label: m.nebari_unilateral_asymetrique() },
		{ value: 'enroche_fissure', label: m.nebari_enroche_fissure() }
	];
}

export function getBarkOptions(): { value: BarkType; label: string }[] {
	return [
		{ value: 'lisse_jeune', label: m.bark_lisse_jeune() },
		{ value: 'ecaillee_mature', label: m.bark_ecaillee_mature() },
		{ value: 'cretelee_profonde', label: m.bark_cretelee_profonde() }
	];
}

export function getDeadwoodOptions(): { value: DeadwoodType; label: string }[] {
	return [
		{ value: 'aucun', label: m.deadwood_aucun() },
		{ value: 'jin', label: m.deadwood_jin() },
		{ value: 'shari', label: m.deadwood_shari() },
		{ value: 'sabamiki', label: m.deadwood_sabamiki() }
	];
}

export function getSizeOptions(): { value: SizeClass; label: string }[] {
	return [
		{ value: 'shohin', label: m.size_shohin() },
		{ value: 'chuhin', label: m.size_chuhin() },
		{ value: 'dai', label: m.size_dai() }
	];
}

export function getCaliberOptions(): { value: Caliber; label: string }[] {
	return [
		{ value: 'fronde', label: m.caliber_fronde() },
		{ value: 'poignet', label: m.caliber_poignet() },
		{ value: 'canette', label: m.caliber_canette() },
		{ value: 'cuisse', label: m.caliber_cuisse() }
	];
}

export function getPhenologyObservedOptions(): { value: PhenologyStageId; label: string }[] {
	return getPhenologyStages().map((stage) => ({ value: stage.id, label: stage.label }));
}

export function getCernageOptions(): { value: CernageStatus; label: string }[] {
	return [
		{ value: 'not_started', label: m.cernage_not_started() },
		{ value: 'partial', label: m.cernage_partial() },
		{ value: 'advanced', label: m.cernage_advanced() },
		{ value: 'completed', label: m.cernage_completed() }
	];
}

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
		const label = getSizeOptions()
			.find((o) => o.value === assessment.sizeClass)
			?.label.split(' ')[0];
		if (label) parts.push(label);
	}
	if (assessment.potentialScore !== null) {
		parts.push(`${assessment.potentialScore}/10`);
	}
	if (assessment.deadwood && assessment.deadwood !== 'aucun') {
		const label = getDeadwoodOptions()
			.find((o) => o.value === assessment.deadwood)
			?.label.split(' ')[0];
		if (label) parts.push(label);
	}

	return parts.join(' · ');
}
