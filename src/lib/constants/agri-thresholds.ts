import type { PhenologyStageId } from '$lib/types/gdd';

/** Seuils Yamadori — Oneshot (Jour J) et tendances 3–7 jours. */
export const YAMADORI_RISK_THRESHOLDS = {
	windSpeedKmh: { passableMin: 25, dangerousMin: 35 },
	airTempC: { dangerousLow: 5, dangerousHigh: 32, passableLow: 8, passableHigh: 28 },
	rainPast3dMm: { excellentMin: 5, excellentMax: 40, dangerousMin: 40 },
	rainPast5dMm: { dryMm: 0 },
	soilStableTempC: { min: 8, max: 15 },
	soilStableDays: { excellentMin: 5, passableMin: 3 },
	soilNightDropMaxDeltaC: 4,
	soilDayToDayDropMaxC: 3,
	soilTrend7dMinDeltaC: 0.3,
	soil18cmTempC: { excellentMin: 9, excellentMax: 13, passableMax: 17, stressMin: 18 },
	frostDangerousC: -3,
	et0TodayMm: { excellentMax: 1.0, passableMax: 5.0 },
	et0Trend7dMeanMm: { excellentMax: 1.0, passableMax: 5.0 },
	shortwaveRadiationMaxTodayWm2: { passableMin: 400, dangerousMin: 600 }
} as const;

/** Poids du malus chute nocturne selon le stade phénologique (0–1). */
export const SOIL_NIGHT_DROP_PHENOLOGY_WEIGHT: Record<PhenologyStageId, number> = {
	dormance: 1,
	bourgeon_gonfle: 1,
	debourrement: 0.75,
	feuillaison: 0.25,
	croissance_active: 0
};

/** Ancres GDD → poids du malus chute nocturne (score 0–100, converti en 0–1). */
export const SOIL_NIGHT_DROP_GDD_WEIGHT_ANCHORS = [
	{ value: 0, score: 100 },
	{ value: 150, score: 100 },
	{ value: 300, score: 75 },
	{ value: 400, score: 50 },
	{ value: 500, score: 25 },
	{ value: 550, score: 0 }
] as const;

/** Seuils de poids pour les niveaux de risque ordinaux. */
export const SOIL_NIGHT_DROP_RISK_WEIGHT = {
	dangerousMin: 0.75,
	passableMin: 0.25,
	excellentBlockMin: 0.25
} as const;
