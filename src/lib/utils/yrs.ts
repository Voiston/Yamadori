import * as m from '$lib/paraglide/messages.js';
import type { AgriData } from '$lib/types/agri';
import type { GddBaseCategory, PhenologyStageId } from '$lib/types/gdd';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { getMicroclimateFactor } from '$lib/constants/environment-exposure';
import {
	getPhenologyStageMeta,
	isEvergreenSpecies,
	isSpeciesInYrsCatalog,
	resolveYrsGddCategory
} from '$lib/constants/gdd-config';
import { resolveYrsGddWindowForSpecies, resolveSpeciesGddProfile } from '$lib/constants/species-gdd-profiles';
import {
	getAoutementOptions,
	getCernageOptions,
	getLeafFallOptions
} from '$lib/constants/assessment';
import type {
	AoutementStatus,
	CernageStatus,
	LeafFallPct,
	YrsConfidence,
	YrsDecision,
	YrsLayerScores,
	YrsPlantInputs,
	YrsSnapshot,
	YrsStoredSnapshot
} from '$lib/types/yrs';
import {
	resolveClimateProfile,
	resolveYamadoriRiskThresholds,
	type YamadoriRiskThresholds
} from '$lib/constants/climate-profiles';
import { resolveDominantPhenologyStage } from '$lib/utils/phenologyResolve';
import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
import { resolveYrsLocalization } from '$lib/geo/yrsLocalization';
import {
	formatSoilNightDropAttenuationLabel,
	getSoilNightDropActivationWeight,
	getSoilNightDropStressPoints,
	isSoilNightDropPenalized
} from '$lib/utils/soilNightDrop';

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function thresholdsFor(data: AgriData): YamadoriRiskThresholds {
	return resolveYamadoriRiskThresholds(data.latitude, data.longitude);
}

/** Continuous harvest-calendar malus: −min(12, 3 × monthsFromWindow). */
export function harvestCalendarPhenologyPenalty(monthsFromWindow: number): number {
	if (monthsFromWindow <= 0) return 0;
	return -Math.min(12, 3 * monthsFromWindow);
}

/** Frost stress points: min(25, 5 + 5×nights + severity°C). */
export function frostStressPenaltyPoints(data: AgriData): number {
	if (data.frostEventsPast7d <= 0 && !data.frostRiskNext7d) return 0;
	const thresholds = thresholdsFor(data);
	let severity = 0;
	if (data.frostRiskNext7d && data.frostMinNext7dC !== null) {
		severity = clamp(Math.round(thresholds.frostDangerousC - data.frostMinNext7dC), 0, 10);
	}
	return Math.min(25, 5 + 5 * data.frostEventsPast7d + severity);
}

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

function phenologyStageLabel(stage: PhenologyStageId | null): string {
	if (!stage) return m.yrs_stage_unknown();
	return getPhenologyStageMeta(stage)?.label ?? stage;
}

function cernageLabel(status: CernageStatus | null | undefined): string {
	if (!status) return m.yrs_cernage_unset();
	return getCernageOptions().find((option) => option.value === status)?.label ?? status;
}

function aoutementLabel(status: AoutementStatus | null | undefined): string {
	if (!status) return '';
	return getAoutementOptions().find((option) => option.value === status)?.label ?? status;
}

function leafFallLabel(pct: LeafFallPct | null | undefined): string {
	if (pct == null) return '';
	return getLeafFallOptions().find((option) => option.value === pct)?.label ?? `${pct}%`;
}

/** Late summer / autumn months where aoutement & leaf-fall inform harvest timing. */
export function isLateSeasonPhenologyContext(
	latitude: number,
	referenceDate: Date = new Date()
): boolean {
	const month = referenceDate.getMonth() + 1;
	if (latitude < 0) {
		return month >= 2 && month <= 5;
	}
	return month >= 8 && month <= 12;
}

function aoutementAdjustment(status: AoutementStatus | null | undefined): number {
	switch (status) {
		case 'aoute':
			return 10;
		case 'en_cours':
			return 4;
		case 'non_aoute':
			return -4;
		default:
			return 0;
	}
}

function leafFallAdjustment(pct: LeafFallPct | null | undefined): number {
	switch (pct) {
		case 100:
			return 10;
		case 80:
			return 8;
		case 50:
			return 3;
		case 25:
			return -2;
		case 0:
			return -5;
		default:
			return 0;
	}
}

function resolveCategory(data: AgriData, inputs: YrsPlantInputs): GddBaseCategory {
	const profile = resolveSpeciesGddProfile(inputs.species);
	if (profile) return profile.category;
	return resolveYrsGddCategory(inputs.species, data.gdd?.baseCategory);
}

function getGddClimatePoints(
	gdd: number | null,
	category: GddBaseCategory,
	species?: string
): YrsScoreBreakdownItem {
	const window = resolveYrsGddWindowForSpecies(species, category);
	if (gdd !== null) {
		if (gdd >= window.optimalMin && gdd <= window.optimalMax) {
			return { label: m.yrs_gdd_favorable({ gdd: String(gdd) }), points: 15 };
		}
		if (gdd >= window.earlyMin && gdd < window.optimalMin) {
			return { label: m.yrs_gdd_early({ gdd: String(gdd) }), points: 8 };
		}
		if (gdd > window.optimalMax && gdd <= window.lateMax) {
			return { label: m.yrs_gdd_late({ gdd: String(gdd) }), points: 8 };
		}
		return { label: m.yrs_gdd_outside({ gdd: String(gdd) }), points: 3 };
	}
	return { label: m.yrs_gdd_unavailable(), points: 2 };
}

function getEt0ClimatePoints(
	data: AgriData,
	thresholds: YamadoriRiskThresholds
): YrsScoreBreakdownItem | null {
	const et0Past = data.et0Past7dMeanMm;
	const et0Forecast = data.et0Trend7dMeanMm;
	if (et0Past === null || et0Forecast === null) return null;

	const { excellentMax } = thresholds.et0Trend7dMeanMm;
	if (et0Past <= excellentMax && et0Forecast <= excellentMax) {
		return {
			label: m.yrs_breakdown_et0_stable({
				past: String(et0Past),
				forecast: String(et0Forecast)
			}),
			points: 5
		};
	}
	if (et0Past <= excellentMax * 2 || et0Forecast <= excellentMax * 2) {
		return {
			label: m.yrs_breakdown_et0_moderate({
				past: String(et0Past),
				forecast: String(et0Forecast)
			}),
			points: 3
		};
	}
	return {
		label: m.yrs_breakdown_et0_high({
			past: String(et0Past),
			forecast: String(et0Forecast)
		}),
		points: 0
	};
}

function getAirClimatePoints(
	data: AgriData,
	thresholds: YamadoriRiskThresholds
): YrsScoreBreakdownItem {
	const { passableLow, passableHigh, dangerousLow, dangerousHigh } = thresholds.airTempC;
	if (
		data.airTemperatureC >= passableLow &&
		data.airTemperatureC <= passableHigh &&
		data.windSpeedKmh < thresholds.windSpeedKmh.passableMin
	) {
		return {
			label: m.yrs_breakdown_air_mild({
				temp: String(data.airTemperatureC),
				wind: String(data.windSpeedKmh)
			}),
			points: 10
		};
	}
	if (
		data.airTemperatureC >= dangerousLow &&
		data.airTemperatureC <= dangerousHigh &&
		data.windSpeedKmh < thresholds.windSpeedKmh.dangerousMin
	) {
		return {
			label: m.yrs_breakdown_air_acceptable({
				temp: String(data.airTemperatureC),
				wind: String(data.windSpeedKmh)
			}),
			points: 5
		};
	}
	return {
		label: m.yrs_breakdown_air_unfavorable({
			temp: String(data.airTemperatureC),
			wind: String(data.windSpeedKmh)
		}),
		points: 0
	};
}

export function getClimateScoreBreakdown(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsLayerBreakdown {
	const category = resolveCategory(data, inputs);
	const thresholds = thresholdsFor(data);
	const items = [
		getGddClimatePoints(data.gdd?.cumulativeSinceJan1 ?? null, category, inputs.species),
		getAirClimatePoints(data, thresholds)
	];
	const et0Item = getEt0ClimatePoints(data, thresholds);
	if (et0Item) items.splice(1, 0, et0Item);

	const total = clamp(
		Math.round(items.reduce((sum, item) => sum + item.points, 0)),
		0,
		30
	);
	return { total, max: 30, items };
}

/** ClimateScore (0–30) : GDD, ET₀ stable, conditions air douces. */
export function computeClimateScore(data: AgriData, inputs: YrsPlantInputs = {}): number {
	return getClimateScoreBreakdown(data, inputs).total;
}

/** SoilScore (0–25) : zone 18 cm, activité 6 cm, stabilité. */
export function getSoilScoreBreakdown(data: AgriData): YrsLayerBreakdown {
	const thresholds = thresholdsFor(data);
	const { excellentMin, excellentMax } = thresholds.soil18cmTempC;
	const temp = String(data.soilTemperature18cmC);
	let soil18Points = 6;
	let soil18Label = m.yrs_breakdown_soil18_high({ temp });

	if (data.soilTemperature18cmC >= excellentMin && data.soilTemperature18cmC <= excellentMax) {
		soil18Points = 15;
		soil18Label = m.yrs_breakdown_soil18_perfect({ temp });
	} else if (data.soilTemperature18cmC >= excellentMin - 2) {
		soil18Points = 8;
		soil18Label = m.yrs_breakdown_soil18_low_limit({ temp });
	} else if (data.soilTemperature18cmC < excellentMin) {
		soil18Points = 2;
		soil18Label = m.yrs_breakdown_soil18_too_cold({ temp });
	}

	const soil6Active =
		data.soilTemperature6cmC >= thresholds.soilStableTempC.min &&
		data.soilTemperature6cmC <= thresholds.soilStableTempC.max;
	const soil6Temp = String(data.soilTemperature6cmC);

	const items: YrsScoreBreakdownItem[] = [
		{ label: soil18Label, points: soil18Points },
		{
			label: soil6Active
				? m.yrs_breakdown_soil6_active({ temp: soil6Temp })
				: m.yrs_breakdown_soil6_inactive({ temp: soil6Temp }),
			points: soil6Active ? 5 : 0
		}
	];

	const stableDaysLabel = m.yrs_breakdown_soil_stable_days({
		days: String(data.soilConsecutiveStableDays)
	});

	if (data.soilConsecutiveStableDays >= thresholds.soilStableDays.excellentMin) {
		items.push({
			label: stableDaysLabel,
			points: 5
		});
	} else if (data.soilConsecutiveStableDays >= thresholds.soilStableDays.passableMin) {
		items.push({
			label: stableDaysLabel,
			points: 3
		});
	} else {
		items.push({
			label: stableDaysLabel,
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

function phenologyStagePoints(
	stage: PhenologyStageId | null,
	category: GddBaseCategory
): number {
	switch (stage) {
		case 'dormance':
			// Mountain species are often lifted still dormant / early wake — slight boost.
			return category === 'montagnarde' ? 8 : 5;
		case 'bourgeon_gonfle':
			return 15;
		case 'pointe_verte':
			return 20;
		case 'debourrement':
		case 'chandelle':
			return 25;
		case 'pinceau':
			return 10;
		case 'feuillaison':
			return category === 'standard' ? 5 : 3;
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
	const category = resolveCategory(data, inputs);
	const stage = resolveDominantPhenologyStage(data, inputs);
	const items: YrsScoreBreakdownItem[] = [];
	const evergreen =
		(inputs.species ? isEvergreenSpecies(inputs.species) : false) ||
		Boolean(data.gdd?.phenologyUnavailableReason);

	if (
		(data.gdd === null && !inputs.observedPhenologyStage) ||
		(evergreen && !inputs.observedPhenologyStage && !stage)
	) {
		items.push({ label: m.yrs_phenology_unavailable(), points: 4 });
	} else {
		const stagePoints = phenologyStagePoints(stage, category);
		const stageLabel = phenologyStageLabel(stage);
		items.push({
			label: inputs.observedPhenologyStage
				? m.yrs_breakdown_stage_observed({ stage: stageLabel })
				: m.yrs_breakdown_stage_estimated({ stage: stageLabel }),
			points: stagePoints
		});
	}

	const cernagePoints = cernageAdjustment(inputs.cernageStatus);
	if (cernagePoints !== 0) {
		items.push({
			label: m.yrs_breakdown_cernage({ status: cernageLabel(inputs.cernageStatus) }),
			points: cernagePoints
		});
	}

	const referenceDate = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
	if (isLateSeasonPhenologyContext(data.latitude, referenceDate)) {
		const aoutementPoints = aoutementAdjustment(inputs.aoutementStatus);
		if (aoutementPoints !== 0) {
			items.push({
				label: m.yrs_breakdown_aoutement({ status: aoutementLabel(inputs.aoutementStatus) }),
				points: aoutementPoints
			});
		}
		const leafFallPoints = leafFallAdjustment(inputs.leafFallPct);
		if (leafFallPoints !== 0) {
			items.push({
				label: m.yrs_breakdown_leaf_fall({ pct: leafFallLabel(inputs.leafFallPct) }),
				points: leafFallPoints
			});
		}
	}

	const harvestPrior = resolveHarvestCalendarPrior(
		inputs.species ?? '',
		data.latitude,
		data.longitude,
		referenceDate
	);
	const harvestPenalty = harvestPrior.applicable
		? harvestCalendarPhenologyPenalty(harvestPrior.monthsFromWindow)
		: 0;
	if (harvestPenalty !== 0) {
		items.push({
			label: m.yrs_breakdown_harvest_calendar_outside(),
			points: harvestPenalty
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

/** HydricScore (0–20) : FAO-proxy Ks + forecast ET₀ stress. */
export function getHydricScoreBreakdown(data: AgriData): YrsLayerBreakdown {
	const items: YrsScoreBreakdownItem[] = [];
	const ks = data.hydricStressKs ?? null;

	if (ks !== null) {
		const ksLabel = String(ks);
		if (ks >= 0.8) {
			items.push({ label: m.yrs_breakdown_ks_excellent({ ks: ksLabel }), points: 20 });
		} else if (ks >= 0.6) {
			items.push({ label: m.yrs_breakdown_ks_good({ ks: ksLabel }), points: 14 });
		} else if (ks >= 0.4) {
			items.push({ label: m.yrs_breakdown_ks_moderate({ ks: ksLabel }), points: 8 });
		} else if (ks >= 0.2) {
			items.push({ label: m.yrs_breakdown_ks_low({ ks: ksLabel }), points: 4 });
		} else {
			items.push({ label: m.yrs_breakdown_ks_critical({ ks: ksLabel }), points: 2 });
		}
	} else if (data.wsi !== null) {
		// Legacy cache without Ks
		if (data.wsi > 5) {
			items.push({
				label: m.yrs_breakdown_wsi_excellent({ wsi: String(data.wsi) }),
				points: 20
			});
		} else if (data.wsi >= -2) {
			items.push({
				label: m.yrs_breakdown_wsi_acceptable({ wsi: String(data.wsi) }),
				points: 10
			});
		} else if (data.wsi >= -8) {
			items.push({
				label: m.yrs_breakdown_wsi_moderate_stress({ wsi: String(data.wsi) }),
				points: 5
			});
		} else {
			items.push({
				label: m.yrs_breakdown_wsi_strong_stress({ wsi: String(data.wsi) }),
				points: 2
			});
		}
	} else if (data.waterBalance7dMm !== null) {
		if (data.waterBalance7dMm > 5) {
			items.push({
				label: m.yrs_breakdown_water_balance_favorable({
					balance: String(data.waterBalance7dMm)
				}),
				points: 15
			});
		} else if (data.waterBalance7dMm >= -5) {
			items.push({
				label: m.yrs_breakdown_water_balance_neutral({
					balance: String(data.waterBalance7dMm)
				}),
				points: 10
			});
		} else {
			items.push({
				label: m.yrs_breakdown_water_balance_deficit({
					balance: String(data.waterBalance7dMm)
				}),
				points: 4
			});
		}
	} else {
		items.push({ label: m.yrs_hydric_unavailable(), points: 3 });
	}

	const thresholds = thresholdsFor(data);
	const excellentWeekly = 7 * thresholds.et0Trend7dMeanMm.excellentMax;
	let futureMalus = 0;
	if (data.futureStressRiskMm !== null && excellentWeekly > 0) {
		if (data.futureStressRiskMm > excellentWeekly * 2) futureMalus = 8;
		else if (data.futureStressRiskMm > excellentWeekly * 1.5) futureMalus = 5;
		else if (data.futureStressRiskMm > excellentWeekly) futureMalus = 3;
	}
	if (futureMalus > 0) {
		items.push({
			label: m.yrs_breakdown_et0_forecast_stress({
				mm: String(data.futureStressRiskMm)
			}),
			points: -futureMalus
		});
	}

	const total = clamp(
		Math.round(items.reduce((sum, item) => sum + item.points, 0)),
		0,
		20
	);
	return { total, max: 20, items };
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
			parts.push(
				m.yrs_breakdown_frost_past({ nights: String(data.frostEventsPast7d) })
			);
		}
		if (data.frostRiskNext7d) {
			parts.push(m.yrs_breakdown_frost_forecast());
		}
		items.push({
			label: m.yrs_breakdown_frost_label({ detail: parts.join(', ') }),
			points: frostStressPenaltyPoints(data)
		});
	}

	const heatDays = data.heatStressDaysPast7d + data.heatStressDaysForecast7d;
	if (heatDays >= 3) {
		items.push({
			label: m.yrs_breakdown_heat({ days: String(heatDays) }),
			points: 10
		});
	} else if (heatDays >= 1) {
		items.push({
			label: m.yrs_breakdown_heat({ days: String(heatDays) }),
			points: 5
		});
	}

	if (data.windStressIndex >= 70) {
		items.push({
			label: m.yrs_breakdown_wind_stress({
				index: String(Math.round(data.windStressIndex))
			}),
			points: 10
		});
	} else if (data.windStressIndex >= 50) {
		items.push({
			label: m.yrs_breakdown_wind_stress({
				index: String(Math.round(data.windStressIndex))
			}),
			points: 5
		});
	}

	if (data.radiationStressIndex >= 75) {
		items.push({
			label: m.yrs_breakdown_radiation_stress({
				index: String(Math.round(data.radiationStressIndex))
			}),
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
		climate: getClimateScoreBreakdown(data, inputs),
		soil: getSoilScoreBreakdown(data),
		phenology: getPhenologyScoreBreakdown(data, inputs),
		hydric: getHydricScoreBreakdown(data),
		stressPenalty: getStressPenaltyBreakdown(data, inputs)
	};
}

export type YrsConfidenceGap = 'gdd' | 'wsi' | 'observedPhenology' | 'speciesMapped';

/** Missing inputs that currently limit YRS confidence. */
export function getYrsConfidenceGaps(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsConfidenceGap[] {
	const gaps: YrsConfidenceGap[] = [];
	if (data.gdd === null) gaps.push('gdd');
	if (
		data.hydricStressKs === null &&
		data.wsi === null &&
		data.waterBalance7dMm === null
	) {
		gaps.push('wsi');
	}
	if (!inputs.observedPhenologyStage) gaps.push('observedPhenology');
	const species = inputs.species?.trim() ?? '';
	if (!species || !isSpeciesInYrsCatalog(species)) {
		gaps.push('speciesMapped');
	}
	return gaps;
}

/** Prefer the gap the user can most easily fix in capture. */
export function getPrimaryYrsConfidenceGap(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsConfidenceGap | null {
	const gaps = new Set(getYrsConfidenceGaps(data, inputs));
	const priority: YrsConfidenceGap[] = [
		'observedPhenology',
		'speciesMapped',
		'wsi',
		'gdd'
	];
	return priority.find((gap) => gaps.has(gap)) ?? null;
}

export function getYrsConfidenceGapCta(gap: YrsConfidenceGap | null): string | null {
	if (!gap) return null;
	if (gap === 'observedPhenology') return m.yrs_confidence_cta_phenology();
	if (gap === 'speciesMapped') return m.yrs_confidence_cta_species();
	if (gap === 'wsi') return m.yrs_confidence_cta_hydric();
	return m.yrs_confidence_cta_gdd();
}

/** Confidence from data completeness — independent of the numeric YRS. */
export function computeYrsConfidence(
	data: AgriData,
	inputs: YrsPlantInputs = {},
	localization: ReturnType<typeof resolveYrsLocalization> = 'local'
): YrsConfidence {
	let points = 0;

	if (data.gdd !== null) points += 2;
	if (data.hydricStressKs !== null || data.wsi !== null) points += 2;
	else if (data.waterBalance7dMm !== null) points += 1;

	if (inputs.observedPhenologyStage) points += 2;
	else if (data.gdd?.phenology) points += 1;

	if (inputs.species?.trim() && isSpeciesInYrsCatalog(inputs.species)) {
		points += 1;
	} else if (inputs.species?.trim()) {
		points += 0.5;
	}

	// Generic Western-Europe defaults outside supported countries → never "high"
	if (localization === 'generic') {
		points = Math.max(0, points - 1);
		if (points >= 6) return 'medium';
	}

	if (points >= 6) return 'high';
	if (points >= 3) return 'medium';
	return 'low';
}

export function getYrsConfidenceLabels(): Record<YrsConfidence, string> {
	return {
		high: m.yrs_confidence_high(),
		medium: m.yrs_confidence_medium(),
		low: m.yrs_confidence_low()
	};
}

export function determineYrsDecision(score: number): YrsDecision {
	if (score >= 80) return 'OPTIMAL';
	if (score >= 60) return 'ACCEPTABLE';
	if (score >= 40) return 'RISK';
	return 'NO_GO';
}

/** Gate OPTIMAL when data confidence is low — numeric score stays unchanged. */
export function applyYrsConfidenceGate(
	score: number,
	confidence: YrsConfidence
): YrsDecision {
	const decision = determineYrsDecision(score);
	if (confidence === 'low' && decision === 'OPTIMAL') {
		return 'ACCEPTABLE';
	}
	return decision;
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

function buildYrsSummary(
	decision: YrsDecision,
	layers: YrsLayerScores,
	data: AgriData,
	inputs: YrsPlantInputs = {},
	confidence: YrsConfidence = 'medium'
): string {
	const label = getYrsDecisionLabels()[decision];
	const layerRatios: [string, number][] = [
		[m.yrs_layer_climate(), layers.climate / 30],
		[m.yrs_layer_soil(), layers.soil / 25],
		[m.yrs_layer_phenology(), layers.phenology / 25],
		[m.yrs_layer_hydric(), layers.hydric / 20]
	];
	const weakest = layerRatios.sort((a, b) => a[1] - b[1])[0];

	if (confidence === 'low') {
		return m.yrs_climate_summary_low_confidence({ label });
	}

	const referenceDate = data.fetchedAt ? new Date(data.fetchedAt) : new Date();
	const harvestPrior = resolveHarvestCalendarPrior(
		inputs.species ?? '',
		data.latitude,
		data.longitude,
		referenceDate
	);
	if (harvestPrior.applicable && !harvestPrior.inWindow) {
		return m.yrs_climate_summary_harvest_calendar({ label });
	}

	if (decision === 'OPTIMAL') {
		return m.yrs_climate_summary_optimal({ label });
	}

	const thresholds = thresholdsFor(data);
	if (data.soilTemperature18cmC < thresholds.soil18cmTempC.excellentMin) {
		return m.yrs_climate_summary_cold_soil({
			label,
			temp: String(data.soilTemperature18cmC)
		});
	}

	if (data.hydricStressKs !== null && data.hydricStressKs < 0.4) {
		return m.yrs_climate_summary_hydric({
			label,
			wsi: String(data.hydricStressKs)
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
		climate: computeClimateScore(data, inputs),
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
	// microclimateFactor is 1.0 for all exposures; attenuation happens in applyEnvironmentExposure.
	const raw =
		(layers.climate + layers.soil + layers.phenology + layers.hydric - layers.stressPenalty) *
		getMicroclimateFactor(inputs.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE);
	const score = clamp(Math.round(raw), 0, 100);
	const localization = resolveYrsLocalization(data.latitude, data.longitude);
	const confidence = computeYrsConfidence(data, inputs, localization);
	const decision = applyYrsConfidenceGate(score, confidence);

	return {
		score,
		decision,
		layers,
		summary: buildYrsSummary(decision, layers, data, inputs, confidence),
		confidence,
		climateProfile: resolveClimateProfile(data.latitude, data.longitude),
		localization
	};
}

export function getCombinedYamadoriVerdict(
	potentialScore: number | null,
	yrs: Pick<YrsSnapshot, 'score'> | null
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
