import * as m from '$lib/paraglide/messages.js';
import type { AgriData } from '$lib/types/agri';
import type { PhenologyStageId } from '$lib/types/gdd';
import type { YrsPlantInputs } from '$lib/types/yrs';
import {
	SOIL_NIGHT_DROP_GDD_WEIGHT_ANCHORS,
	SOIL_NIGHT_DROP_PHENOLOGY_WEIGHT,
	SOIL_NIGHT_DROP_RISK_WEIGHT
} from '$lib/constants/agri-thresholds';
import { resolveDominantPhenologyStage } from '$lib/utils/phenologyResolve';

const STRESS_PENALTY_MAX_POINTS = 5;

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function piecewiseWeight(value: number, anchors: readonly { value: number; score: number }[]): number {
	if (anchors.length === 0) return 0;

	const sorted = [...anchors].sort((a, b) => a.value - b.value);
	if (value <= sorted[0].value) return clamp01(sorted[0].score / 100);
	if (value >= sorted[sorted.length - 1].value) {
		return clamp01(sorted[sorted.length - 1].score / 100);
	}

	for (let i = 0; i < sorted.length - 1; i += 1) {
		const left = sorted[i];
		const right = sorted[i + 1];
		if (value < left.value || value > right.value) continue;

		const span = right.value - left.value;
		if (span === 0) return clamp01(left.score / 100);

		const ratio = (value - left.value) / span;
		const score = left.score + ratio * (right.score - left.score);
		return clamp01(score / 100);
	}

	return 0;
}

function getPhenologyNightDropWeight(stage: PhenologyStageId): number {
	return SOIL_NIGHT_DROP_PHENOLOGY_WEIGHT[stage];
}

function getGddNightDropWeight(gddCumulative: number): number {
	return piecewiseWeight(gddCumulative, SOIL_NIGHT_DROP_GDD_WEIGHT_ANCHORS);
}

/**
 * Poids d'activation du malus chute nocturne (0–1).
 * Phénologie (observée ou estimée) > GDD progressif > 1.0 si indisponible.
 */
export function getSoilNightDropActivationWeight(
	data: Pick<AgriData, 'gdd'>,
	inputs: YrsPlantInputs = {}
): number {
	if (inputs.observedPhenologyStage) {
		return getPhenologyNightDropWeight(inputs.observedPhenologyStage);
	}

	const estimatedStage = resolveDominantPhenologyStage(data as AgriData, inputs);
	if (estimatedStage) {
		return getPhenologyNightDropWeight(estimatedStage);
	}

	const gdd = data.gdd?.cumulativeSinceJan1;
	if (gdd !== undefined && gdd !== null) {
		return getGddNightDropWeight(gdd);
	}

	return 1;
}

export function isSoilNightDropPenalized(
	data: Pick<AgriData, 'soilBrutalNightDrop' | 'gdd'>,
	inputs: YrsPlantInputs = {},
	minWeight = 0
): boolean {
	if (!data.soilBrutalNightDrop) return false;
	return getSoilNightDropActivationWeight(data, inputs) >= minWeight;
}

export function getSoilNightDropStressPoints(weight: number): number {
	if (weight <= 0) return 0;
	return Math.round(STRESS_PENALTY_MAX_POINTS * weight);
}

export function getSoilNightDropStabilityScore(soilBrutalNightDrop: boolean, weight: number): number {
	if (!soilBrutalNightDrop || weight <= 0) return 100;
	return Math.round(30 + 70 * (1 - weight));
}

export function assessSoilNightDropRiskLevel(
	soilBrutalNightDrop: boolean,
	weight: number
): 'Excellent' | 'Passable' | 'Dangereux' {
	if (!soilBrutalNightDrop || weight <= 0) return 'Excellent';
	if (weight >= SOIL_NIGHT_DROP_RISK_WEIGHT.dangerousMin) return 'Dangereux';
	if (weight >= SOIL_NIGHT_DROP_RISK_WEIGHT.passableMin) return 'Passable';
	return 'Excellent';
}

export function formatSoilNightDropAttenuationLabel(
	data: Pick<AgriData, 'gdd'>,
	inputs: YrsPlantInputs,
	weight: number
): string | null {
	if (weight >= 1) return null;

	const stage = resolveDominantPhenologyStage(data as AgriData, inputs);
	if (stage === 'croissance_active') {
		return m.yrs_soil_night_ignored();
	}
	if (inputs.observedPhenologyStage || stage) {
		return m.yrs_soil_night_attenuated();
	}
	const gdd = data.gdd?.cumulativeSinceJan1;
	if (gdd !== undefined && gdd !== null) {
		return m.yrs_soil_night_attenuated_gdd({ gdd: String(gdd) });
	}
	return m.yrs_soil_night_attenuated();
}
