import * as m from '$lib/paraglide/messages.js';
import type { AgriData } from '$lib/types/agri';
import type { PhenologyStageId } from '$lib/types/gdd';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { getMicroclimateFactor } from '$lib/constants/environment-exposure';
import { getPhenologyStages } from '$lib/constants/gdd-config';
import { getCernageOptions } from '$lib/constants/assessment';
import type {
	CernageStatus,
	YrsDecision,
	YrsLayerScores,
	YrsPlantInputs,
	YrsSnapshot,
	YrsStoredSnapshot
} from '$lib/types/yrs';
import { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';
import { resolveDominantPhenologyStage } from '$lib/utils/phenologyResolve';
import {
	formatSoilNightDropAttenuationLabel,
	getSoilNightDropActivationWeight,
	getSoilNightDropStressPoints,
	isSoilNightDropPenalized
} from '$lib/utils/soilNightDrop';

const GDD_OPTIMAL_MIN = 150;
const GDD_OPTIMAL_MAX = 400;

export interface YrsScoreBreakdownItem {
	label: string;
	points: number;
}

export interface YrsLayerBreakdown {
	total: number;
	max?: number;
	items: YrsScoreBreakdownItem[];
}

export type YrsLayerKey = 'climate' | 'soil' | 'phenology' | 'hydric' | 'stressPenalty';

export interface YrsScoreBreakdown {
	climate: YrsLayerBreakdown;
	soil: YrsLayerBreakdown;
	phenology: YrsLayerBreakdown;
	hydric: YrsLayerBreakdown;
	stressPenalty: YrsLayerBreakdown;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function phenologyStageLabel(stage: PhenologyStageId | null): string {
	if (!stage) return m.yrs_stage_unknown();
	return getPhenologyStages().find((entry) => entry.id === stage)?.label ?? stage;
}

function cernageLabel(status: CernageStatus | null | undefined): string {
	if (!status) return m.yrs_cernage_unset();
	return getCernageOptions().find((option) => option.value === status)?.label ?? status;
}

function getGddClimatePoints(gdd: number | null): YrsScoreBreakdownItem {
	if (gdd !== null) {
		if (gdd >= GDD_OPTIMAL_MIN && gdd <= GDD_OPTIMAL_MAX) {
			return { label: m.yrs_gdd_favorable({ gdd: String(gdd) }), points: 15 };
		}
		if (gdd >= 80 && gdd < GDD_OPTIMAL_MIN) {
			return { label: m.yrs_gdd_early({ gdd: String(gdd) }), points: 8 };
		}
		if (gdd > GDD_OPTIMAL_MAX && gdd <= 550) {
			return { label: m.yrs_gdd_late({ gdd: String(gdd) }), points: 8 };
		}
		return { label: m.yrs_gdd_outside({ gdd: String(gdd) }), points: 3 };
	}
	return { label: m.yrs_gdd_unavailable(), points: 5 };
}

function getEt0ClimatePoints(data: AgriData): YrsScoreBreakdownItem | null {
	const et0Past = data.et0Past7dMeanMm;
	const et0Forecast = data.et0Trend7dMeanMm;
	if (et0Past === null || et0Forecast === null) return null;

	const { excellentMax } = YAMADORI_RISK_THRESHOLDS.et0Trend7dMeanMm;
	if (et0Past <= excellentMax && et0Forecast <= excellentMax) {
		return {
			label: `ET₀ moy. ${et0Past} / ${et0Forecast} mm/j — stable`,
			points: 5
		};
	}
	if (et0Past <= excellentMax * 2 || et0Forecast <= excellentMax * 2) {
		return {
			label: `ET₀ moy. ${et0Past} / ${et0Forecast} mm/j — modéré`,
			points: 3
		};
	}
	return {
		label: `ET₀ moy. ${et0Past} / ${et0Forecast} mm/j — élevé`,
		points: 0
	};
}

function getAirClimatePoints(data: AgriData): YrsScoreBreakdownItem {
	const { passableLow, passableHigh, dangerousLow, dangerousHigh } = YAMADORI_RISK_THRESHOLDS.airTempC;
	if (
		data.airTemperatureC >= passableLow &&
		data.airTemperatureC <= passableHigh &&
		data.windSpeedKmh < YAMADORI_RISK_THRESHOLDS.windSpeedKmh.passableMin
	) {
		return {
			label: `Air ${data.airTemperatureC}°C, vent ${data.windSpeedKmh} km/h — doux`,
			points: 10
		};
	}
	if (
		data.airTemperatureC >= dangerousLow &&
		data.airTemperatureC <= dangerousHigh &&
		data.windSpeedKmh < YAMADORI_RISK_THRESHOLDS.windSpeedKmh.dangerousMin
	) {
		return {
			label: `Air ${data.airTemperatureC}°C, vent ${data.windSpeedKmh} km/h — acceptable`,
			points: 5
		};
	}
	return {
		label: `Air ${data.airTemperatureC}°C, vent ${data.windSpeedKmh} km/h — défavorable`,
		points: 0
	};
}

export function getClimateScoreBreakdown(data: AgriData): YrsLayerBreakdown {
	const items = [
		getGddClimatePoints(data.gdd?.cumulativeSinceJan1 ?? null),
		getAirClimatePoints(data)
	];
	const et0Item = getEt0ClimatePoints(data);
	if (et0Item) items.splice(1, 0, et0Item);

	const total = clamp(
		Math.round(items.reduce((sum, item) => sum + item.points, 0)),
		0,
		30
	);
	return { total, max: 30, items };
}

/** ClimateScore (0–30) : GDD, ET₀ stable, conditions air douces. */
export function computeClimateScore(data: AgriData): number {
	return getClimateScoreBreakdown(data).total;
}

/** SoilScore (0–25) : zone 18 cm, activité 6 cm, stabilité. */
export function getSoilScoreBreakdown(data: AgriData): YrsLayerBreakdown {
	const { excellentMin, excellentMax } = YAMADORI_RISK_THRESHOLDS.soil18cmTempC;
	let soil18Points = 6;
	let soil18Label = `Sol 18 cm ${data.soilTemperature18cmC}°C — zone haute`;

	if (data.soilTemperature18cmC >= excellentMin && data.soilTemperature18cmC <= excellentMax) {
		soil18Points = 15;
		soil18Label = `Sol 18 cm ${data.soilTemperature18cmC}°C — zone parfaite`;
	} else if (data.soilTemperature18cmC >= excellentMin - 2) {
		soil18Points = 8;
		soil18Label = `Sol 18 cm ${data.soilTemperature18cmC}°C — limite basse`;
	} else if (data.soilTemperature18cmC < excellentMin) {
		soil18Points = 2;
		soil18Label = `Sol 18 cm ${data.soilTemperature18cmC}°C — trop froid`;
	}

	const soil6Active =
		data.soilTemperature6cmC >= YAMADORI_RISK_THRESHOLDS.soilStableTempC.min &&
		data.soilTemperature6cmC <= YAMADORI_RISK_THRESHOLDS.soilStableTempC.max;

	const items: YrsScoreBreakdownItem[] = [
		{ label: soil18Label, points: soil18Points },
		{
			label: soil6Active
				? `Sol 6 cm ${data.soilTemperature6cmC}°C — actif (8–15 °C)`
				: `Sol 6 cm ${data.soilTemperature6cmC}°C — hors plage active`,
			points: soil6Active ? 5 : 0
		}
	];

	if (data.soilConsecutiveStableDays >= YAMADORI_RISK_THRESHOLDS.soilStableDays.excellentMin) {
		items.push({
			label: `${data.soilConsecutiveStableDays} j stables à 8–15 °C`,
			points: 5
		});
	} else if (data.soilConsecutiveStableDays >= YAMADORI_RISK_THRESHOLDS.soilStableDays.passableMin) {
		items.push({
			label: `${data.soilConsecutiveStableDays} j stables à 8–15 °C`,
			points: 3
		});
	} else {
		items.push({
			label: `${data.soilConsecutiveStableDays} j stables à 8–15 °C`,
			points: 0
		});
	}

	const total = clamp(
		Math.round(items.reduce((sum, item) => sum + item.points, 0)),
		0,
		25
	);
	return { total, max: 25, items };
}

export function computeSoilScore(data: AgriData): number {
	return getSoilScoreBreakdown(data).total;
}

function phenologyStagePoints(stage: PhenologyStageId | null): number {
	switch (stage) {
		case 'dormance':
			return 5;
		case 'bourgeon_gonfle':
			return 15;
		case 'debourrement':
			return 25;
		case 'feuillaison':
			return 3;
		case 'croissance_active':
			return -5;
		default:
			return 8;
	}
}

function cernageAdjustment(status: CernageStatus | null | undefined): number {
	switch (status) {
		case 'not_started':
			return 0;
		case 'partial':
			return 3;
		case 'advanced':
			return 5;
		case 'completed':
			return -8;
		default:
			return 0;
	}
}

/** PhenologyScore (0–25) : stade biologique + cernage observé. */
export function getPhenologyScoreBreakdown(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsLayerBreakdown {
	const stage = resolveDominantPhenologyStage(data, inputs);
	const items: YrsScoreBreakdownItem[] = [];

	if (data.gdd === null && !inputs.observedPhenologyStage) {
		items.push({ label: m.yrs_phenology_unavailable(), points: 10 });
	} else {
		const stagePoints = phenologyStagePoints(stage);
		const source = inputs.observedPhenologyStage ? 'observé' : 'estimé (GDD)';
		items.push({
			label: `Stade ${phenologyStageLabel(stage)} (${source})`,
			points: stagePoints
		});
	}

	const cernagePoints = cernageAdjustment(inputs.cernageStatus);
	if (cernagePoints !== 0) {
		items.push({
			label: `Cernage : ${cernageLabel(inputs.cernageStatus)}`,
			points: cernagePoints
		});
	}

	const total = clamp(
		Math.round(items.reduce((sum, item) => sum + item.points, 0)),
		0,
		25
	);
	return { total, max: 25, items };
}

export function computePhenologyScore(data: AgriData, inputs: YrsPlantInputs = {}): number {
	return getPhenologyScoreBreakdown(data, inputs).total;
}

/** HydricScore (0–20) : WSI et risque futur. */
export function getHydricScoreBreakdown(data: AgriData): YrsLayerBreakdown {
	let item: YrsScoreBreakdownItem;

	if (data.wsi === null) {
		if (data.waterBalance7dMm !== null) {
			if (data.waterBalance7dMm > 5) {
				item = {
					label: `Bilan hydrique ${data.waterBalance7dMm} mm — favorable`,
					points: 15
				};
			} else if (data.waterBalance7dMm >= -5) {
				item = {
					label: `Bilan hydrique ${data.waterBalance7dMm} mm — neutre`,
					points: 10
				};
			} else {
				item = {
					label: `Bilan hydrique ${data.waterBalance7dMm} mm — déficitaire`,
					points: 4
				};
			}
		} else {
			item = { label: m.yrs_hydric_unavailable(), points: 8 };
		}
	} else if (data.wsi > 5) {
		item = { label: `WSI ${data.wsi} mm — excellent`, points: 20 };
	} else if (data.wsi >= -2) {
		item = { label: `WSI ${data.wsi} mm — acceptable`, points: 10 };
	} else if (data.wsi >= -8) {
		item = { label: `WSI ${data.wsi} mm — stress modéré`, points: 5 };
	} else {
		item = { label: `WSI ${data.wsi} mm — stress fort`, points: 2 };
	}

	return { total: item.points, max: 20, items: [item] };
}

export function computeHydricScore(data: AgriData): number {
	return getHydricScoreBreakdown(data).total;
}

/** StressPenalty : gel, canicule, vent sec, rayonnement. */
export function getStressPenaltyBreakdown(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsLayerBreakdown {
	const items: YrsScoreBreakdownItem[] = [];

	if (data.frostEventsPast7d > 0 || data.frostRiskNext7d) {
		const parts: string[] = [];
		if (data.frostEventsPast7d > 0) {
			parts.push(`${data.frostEventsPast7d} nuit(s) gel passé`);
		}
		if (data.frostRiskNext7d) {
			parts.push('gel sévère prévu');
		}
		items.push({ label: `Gel : ${parts.join(', ')}`, points: 15 });
	}

	const heatDays = data.heatStressDaysPast7d + data.heatStressDaysForecast7d;
	if (heatDays >= 3) {
		items.push({
			label: `Canicule : ${heatDays} j > 30 °C`,
			points: 10
		});
	} else if (heatDays >= 1) {
		items.push({
			label: `Canicule : ${heatDays} j > 30 °C`,
			points: 5
		});
	}

	if (data.windStressIndex >= 70) {
		items.push({
			label: `Stress vent sec : ${Math.round(data.windStressIndex)}/100`,
			points: 10
		});
	} else if (data.windStressIndex >= 50) {
		items.push({
			label: `Stress vent sec : ${Math.round(data.windStressIndex)}/100`,
			points: 5
		});
	}

	if (data.radiationStressIndex >= 75) {
		items.push({
			label: `Stress rayonnement : ${Math.round(data.radiationStressIndex)}/100`,
			points: 5
		});
	}

	if (isSoilNightDropPenalized(data, inputs)) {
		const weight = getSoilNightDropActivationWeight(data, inputs);
		const points = getSoilNightDropStressPoints(weight);
		if (points > 0) {
			const attenuation = formatSoilNightDropAttenuationLabel(data, inputs, weight);
			const label = attenuation
				? `${m.yrs_soil_night_drop()} — ${attenuation}`
				: m.yrs_soil_night_drop();
			items.push({ label, points });
		}
	}

	const total = items.reduce((sum, item) => sum + item.points, 0);
	return { total, items };
}

export function computeStressPenalty(data: AgriData, inputs: YrsPlantInputs = {}): number {
	return getStressPenaltyBreakdown(data, inputs).total;
}

export function getYrsScoreBreakdown(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsScoreBreakdown {
	return {
		climate: getClimateScoreBreakdown(data),
		soil: getSoilScoreBreakdown(data),
		phenology: getPhenologyScoreBreakdown(data, inputs),
		hydric: getHydricScoreBreakdown(data),
		stressPenalty: getStressPenaltyBreakdown(data, inputs)
	};
}

export function determineYrsDecision(score: number): YrsDecision {
	if (score >= 80) return 'OPTIMAL';
	if (score >= 60) return 'ACCEPTABLE';
	if (score >= 40) return 'RISK';
	return 'NO_GO';
}

export function getYrsDecisionLabels(): Record<YrsDecision, string> {
	return {
		OPTIMAL: m.yrs_decision_optimal(),
		ACCEPTABLE: m.yrs_decision_acceptable(),
		RISK: m.yrs_decision_risk(),
		NO_GO: m.yrs_decision_no_go()
	};
}

export function getYrsScoreLabel(): string {
	return m.yrs_score_label();
}

function buildYrsSummary(decision: YrsDecision, layers: YrsLayerScores, data: AgriData): string {
	const label = getYrsDecisionLabels()[decision];
	const layerRatios: [string, number][] = [
		[m.yrs_layer_climate(), layers.climate / 30],
		[m.yrs_layer_soil(), layers.soil / 25],
		[m.yrs_layer_phenology(), layers.phenology / 25],
		[m.yrs_layer_hydric(), layers.hydric / 20]
	];
	const weakest = layerRatios.sort((a, b) => a[1] - b[1])[0];

	if (decision === 'OPTIMAL') {
		return m.yrs_climate_summary_optimal({ label });
	}

	if (data.soilTemperature18cmC < YAMADORI_RISK_THRESHOLDS.soil18cmTempC.excellentMin) {
		return m.yrs_climate_summary_cold_soil({
			label,
			temp: String(data.soilTemperature18cmC)
		});
	}

	if (data.wsi !== null && data.wsi < -5) {
		return m.yrs_climate_summary_hydric({ label, wsi: String(data.wsi) });
	}

	return m.yrs_climate_summary_limiting({
		label,
		factor: weakest?.[0] ?? m.yrs_score_label()
	});
}

export function computeYrsLayers(data: AgriData, inputs: YrsPlantInputs = {}): YrsLayerScores {
	return {
		climate: computeClimateScore(data),
		soil: computeSoilScore(data),
		phenology: computePhenologyScore(data, inputs),
		hydric: computeHydricScore(data),
		stressPenalty: computeStressPenalty(data, inputs)
	};
}

export function computeYamadoriReadinessScore(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsSnapshot {
	const layers = computeYrsLayers(data, inputs);
	const raw =
		(layers.climate + layers.soil + layers.phenology + layers.hydric - layers.stressPenalty) *
		getMicroclimateFactor(inputs.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE);
	const score = clamp(Math.round(raw), 0, 100);
	const decision = determineYrsDecision(score);

	return {
		score,
		decision,
		layers,
		summary: buildYrsSummary(decision, layers, data)
	};
}

export function getCombinedYamadoriVerdict(
	potentialScore: number | null,
	yrs: YrsSnapshot | null
): string | null {
	if (!yrs || potentialScore === null) return null;
	if (potentialScore >= 7 && yrs.score >= 60) {
		return m.yrs_verdict_good_candidate();
	}
	if (potentialScore >= 7 && yrs.score < 40) {
		return m.yrs_verdict_wait();
	}
	if (potentialScore < 4 && yrs.score >= 80) {
		return m.yrs_verdict_limited_interest();
	}
	return null;
}

const YRS_BANNER_CLASSES: Record<YrsDecision, string> = {
	OPTIMAL: 'border-emerald-100',
	ACCEPTABLE: 'border-amber-100',
	RISK: 'border-orange-100',
	NO_GO: 'border-red-100'
};

const YRS_BANNER_ACCENT_CLASSES: Record<YrsDecision, string> = {
	OPTIMAL: 'bg-emerald-400',
	ACCEPTABLE: 'bg-amber-400',
	RISK: 'bg-orange-400',
	NO_GO: 'bg-red-400'
};

/** Classes Tailwind du bandeau YRS selon le score ou la décision. */
export function getYrsBannerClasses(score: number, decision?: YrsDecision): string {
	return YRS_BANNER_CLASSES[decision ?? determineYrsDecision(score)];
}

export function getYrsBannerAccentClasses(score: number, decision?: YrsDecision): string {
	return YRS_BANNER_ACCENT_CLASSES[decision ?? determineYrsDecision(score)];
}

export function getYrsDecisionTextClass(decision: YrsDecision): string {
	if (decision === 'OPTIMAL') return 'text-emerald-700';
	if (decision === 'ACCEPTABLE') return 'text-amber-700';
	if (decision === 'RISK') return 'text-orange-700';
	return 'text-red-700';
}

export function getYrsDecisionPillClass(decision: YrsDecision): string {
	if (decision === 'OPTIMAL') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
	if (decision === 'ACCEPTABLE') return 'bg-amber-50 text-amber-900 border-amber-200';
	if (decision === 'RISK') return 'bg-orange-50 text-orange-900 border-orange-200';
	return 'bg-red-50 text-red-800 border-red-200';
}

export function toYrsStoredSnapshot(
	yrs: YrsSnapshot,
	capturedAt = new Date().toISOString()
): YrsStoredSnapshot {
	return {
		score: yrs.score,
		decision: yrs.decision,
		summary: yrs.summary,
		capturedAt
	};
}
