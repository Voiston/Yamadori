import * as m from '$lib/paraglide/messages.js';
import type {
	BarkType,
	Caliber,
	CernageStatus,
	DeadwoodFeature,
	NebariType,
	SizeClass,
	TreeAssessment
} from '$lib/types/tree';
import type { AoutementStatus, LeafFallPct } from '$lib/types/yrs';
import type { PhenologyStageId } from '$lib/types/gdd';
import {
	getFieldOnlyPhenologyStages,
	getPhenologyStages,
	isEvergreenSpecies
} from '$lib/constants/gdd-config';

const DEADWOOD_FEATURES: readonly DeadwoodFeature[] = ['jin', 'shari', 'sabamiki'];

/** Normalize legacy scalar deadwood (`null` / `aucun` / string) into a feature array. */
export function normalizeDeadwood(value: unknown): DeadwoodFeature[] {
	if (Array.isArray(value)) {
		return value.filter((entry): entry is DeadwoodFeature =>
			DEADWOOD_FEATURES.includes(entry as DeadwoodFeature)
		);
	}
	if (value === 'jin' || value === 'shari' || value === 'sabamiki') {
		return [value];
	}
	return [];
}

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

export function getDeadwoodOptions(): { value: DeadwoodFeature; label: string }[] {
	return [
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

export function getPhenologyObservedOptions(
	species?: string | null
): { value: PhenologyStageId; label: string }[] {
	const stages = getPhenologyStages().map((stage) => ({
		value: stage.id as PhenologyStageId,
		label: stage.label
	}));
	if (species && isEvergreenSpecies(species)) {
		stages.push(
			...getFieldOnlyPhenologyStages().map((stage) => ({
				value: stage.id,
				label: stage.label
			}))
		);
	}
	return stages;
}

export function getAoutementOptions(): { value: AoutementStatus; label: string }[] {
	return [
		{ value: 'non_aoute', label: m.aoutement_non_aoute() },
		{ value: 'en_cours', label: m.aoutement_en_cours() },
		{ value: 'aoute', label: m.aoutement_aoute() }
	];
}

export function getLeafFallOptions(): { value: LeafFallPct; label: string }[] {
	return [
		{ value: 0, label: m.leaf_fall_0() },
		{ value: 25, label: m.leaf_fall_25() },
		{ value: 50, label: m.leaf_fall_50() },
		{ value: 80, label: m.leaf_fall_80() },
		{ value: 100, label: m.leaf_fall_100() }
	];
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

export function getAssessmentSummary(assessment: TreeAssessment): string {
	const parts: string[] = [];

	if (assessment.sizeClass) {
		const label = getSizeOptions()
			.find((o) => o.value === assessment.sizeClass)
			?.label.split(' ')[0];
		if (label) parts.push(label);
	}
	if (assessment.potentialScore !== null && assessment.potentialScore !== undefined) {
		parts.push(`${assessment.potentialScore}/10`);
	}
	if (assessment.trunkDiameterCm != null && Number.isFinite(assessment.trunkDiameterCm)) {
		parts.push(`Ø ${assessment.trunkDiameterCm} cm`);
	}
	if (assessment.deadwood.length > 0) {
		const labels = assessment.deadwood
			.map(
				(feature) =>
					getDeadwoodOptions()
						.find((o) => o.value === feature)
						?.label.split(' ')[0]
			)
			.filter((label): label is string => Boolean(label));
		if (labels.length > 0) parts.push(labels.join('+'));
	}
	if (assessment.bark) {
		const label = getBarkOptions()
			.find((o) => o.value === assessment.bark)
			?.label.split(' ')[0];
		if (label) parts.push(label);
	}

	return parts.join(' · ');
}
