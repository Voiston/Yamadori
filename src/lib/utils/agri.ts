import * as m from '$lib/paraglide/messages.js';
import type {
	AgriData,
	AgriMetricRisks,
	AgriRiskLevel,
	SoilDailySample,
	ViabilityDay,
	ViabilityGoNoGo,
	WeeklyViability,
	YamadoriRiskAssessment,
	YrsDetailMetricRisks
} from '$lib/types/agri';
import type { GddSnapshot } from '$lib/types/gdd';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { applyEnvironmentExposure } from '$lib/utils/adjustedClimate';
import type { YrsPlantInputs } from '$lib/types/yrs';
import { YAMADORI_RISK_THRESHOLDS, SOIL_NIGHT_DROP_RISK_WEIGHT } from '$lib/constants/agri-thresholds';
import { parseOpenMeteoErrorResponse } from '$lib/utils/climate';
import { computeGddSnapshot } from '$lib/utils/gdd';
import {
	computeFutureStressRisk,
	computeRadiationStressIndex,
	computeSoilBufferScore,
	computeWindStressIndex,
	computeWSI
} from '$lib/utils/hydric';
import { computeYamadoriReadinessScore } from '$lib/utils/yrs';
import {
	assessSoilNightDropRiskLevel,
	getSoilNightDropActivationWeight,
	getSoilNightDropStabilityScore,
	isSoilNightDropPenalized
} from '$lib/utils/soilNightDrop';

const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
const FETCH_TIMEOUT_MS = 15_000;
const PAST_DAYS = 7;
const FORECAST_DAYS = 7;
const SOIL_MEAN_DAYS = 5;
const VIABILITY_GO_MIN_SCORE = 65;
const VIABILITY_PRUDENT_MAX_SCORE = 79;

const VIABILITY_METRIC_WEIGHTS: Record<keyof AgriMetricRisks, number> = {
	soil: 1.5,
	frost: 1.5,
	wind: 1.2,
	air: 1.0,
	rain: 1.0,
	et0: 1.0,
	radiation: 1.0
};

export { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';

export type OpenMeteoForecastResponse = {
	timezone?: string;
	hourly?: {
		time?: string[];
		temperature_2m?: (number | null)[];
		relative_humidity_2m?: (number | null)[];
		wind_speed_10m?: (number | null)[];
		soil_temperature_6cm?: (number | null)[];
		soil_temperature_18cm?: (number | null)[];
		soil_moisture_0_to_7cm?: (number | null)[];
		et0_fao_evapotranspiration?: (number | null)[];
		shortwave_radiation?: (number | null)[];
	};
	daily?: {
		time?: string[];
		precipitation_sum?: (number | null)[];
		temperature_2m_min?: (number | null)[];
		temperature_2m_max?: (number | null)[];
		et0_fao_evapotranspiration?: (number | null)[];
	};
};

type MetricRisk = AgriRiskLevel;

function formatIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Retourne l'index du premier créneau horaire >= maintenant.
 * Si tous les créneaux sont passés, retourne le dernier index.
 */
export function findCurrentHourIndex(times: string[], referenceDate = new Date()): number {
	if (times.length === 0) return 0;

	const now = referenceDate.getTime();
	for (let i = 0; i < times.length; i++) {
		if (new Date(times[i]).getTime() >= now) {
			return i;
		}
	}
	return times.length - 1;
}

/** Index du jour « aujourd'hui » dans le tableau daily.time. */
export function findTodayDailyIndex(dailyTimes: string[], referenceDate = new Date()): number {
	const today = formatIsoDate(referenceDate);
	const exact = dailyTimes.indexOf(today);
	if (exact >= 0) return exact;

	for (let i = 0; i < dailyTimes.length; i++) {
		if (dailyTimes[i] >= today) return i;
	}
	return Math.max(0, dailyTimes.length - 1);
}

/** Somme les précipitations journalières sur les N premières valeurs du tableau. */
export function sumPrecipitation(dailySums: (number | null)[], days: number): number {
	const slice = dailySums.slice(0, days);
	const total = slice.reduce<number>((sum, value) => sum + (value ?? 0), 0);
	return Math.round(total * 10) / 10;
}

/** Cumul de pluie sur les N jours complets avant aujourd'hui. */
export function sumPastPrecipitation(
	dailyTimes: string[],
	dailyPrecip: (number | null)[],
	days: number,
	referenceDate = new Date()
): number {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const startIdx = Math.max(0, todayIdx - days);
	const slice = dailyPrecip.slice(startIdx, todayIdx);
	if (slice.length === 0) return 0;
	return sumPrecipitation(slice, slice.length);
}

/** Moyenne horaire d'une variable pour une date ISO (YYYY-MM-DD). */
export function dailyMeanForDate(
	hourlyTimes: string[],
	values: (number | null)[],
	dateStr: string
): number | null {
	const dayValues: number[] = [];
	for (let i = 0; i < hourlyTimes.length; i++) {
		if (!hourlyTimes[i]?.startsWith(dateStr)) continue;
		const value = values[i];
		if (value !== null && value !== undefined) {
			dayValues.push(value);
		}
	}
	if (dayValues.length === 0) return null;
	const mean = dayValues.reduce((sum, value) => sum + value, 0) / dayValues.length;
	return Math.round(mean * 10) / 10;
}

/** Minimum horaire d'une variable pour une date ISO (YYYY-MM-DD). */
export function dailyMinForDate(
	hourlyTimes: string[],
	values: (number | null)[],
	dateStr: string
): number | null {
	const dayValues: number[] = [];
	for (let i = 0; i < hourlyTimes.length; i++) {
		if (!hourlyTimes[i]?.startsWith(dateStr)) continue;
		const value = values[i];
		if (value !== null && value !== undefined) {
			dayValues.push(value);
		}
	}
	if (dayValues.length === 0) return null;
	return Math.round(Math.min(...dayValues) * 10) / 10;
}

/** Maximum horaire d'une variable pour une date ISO (YYYY-MM-DD). */
export function dailyMaxForDate(
	hourlyTimes: string[],
	values: (number | null)[],
	dateStr: string
): number | null {
	const dayValues: number[] = [];
	for (let i = 0; i < hourlyTimes.length; i++) {
		if (!hourlyTimes[i]?.startsWith(dateStr)) continue;
		const value = values[i];
		if (value !== null && value !== undefined) {
			dayValues.push(value);
		}
	}
	if (dayValues.length === 0) return null;
	return Math.round(Math.max(...dayValues));
}

/** Compte la plus longue série de jours consécutifs dans la plage de température cible. */
export function countConsecutiveSoilStableDays(
	dailyMeans: (number | null)[],
	minTemp = YAMADORI_RISK_THRESHOLDS.soilStableTempC.min,
	maxTemp = YAMADORI_RISK_THRESHOLDS.soilStableTempC.max
): number {
	let maxRun = 0;
	let currentRun = 0;
	for (const mean of dailyMeans) {
		if (mean !== null && mean >= minTemp && mean <= maxTemp) {
			currentRun += 1;
			maxRun = Math.max(maxRun, currentRun);
		} else {
			currentRun = 0;
		}
	}
	return maxRun;
}

/** Détecte une chute nocturne brutale ou une chute jour-à-jour importante. */
export function detectBrutalNightDrop(
	dailyMeans: (number | null)[],
	dailyMins: (number | null)[],
	nightDropMaxDeltaC = YAMADORI_RISK_THRESHOLDS.soilNightDropMaxDeltaC,
	dayToDayDropMaxC = YAMADORI_RISK_THRESHOLDS.soilDayToDayDropMaxC
): boolean {
	for (let i = 0; i < dailyMeans.length; i++) {
		const mean = dailyMeans[i];
		const min = dailyMins[i];
		if (mean !== null && min !== null && mean - min > nightDropMaxDeltaC) {
			return true;
		}
		if (i > 0) {
			const prevMean = dailyMeans[i - 1];
			if (mean !== null && prevMean !== null && prevMean - mean > dayToDayDropMaxC) {
				return true;
			}
		}
	}
	return false;
}

/** Vérifie si la tendance sur 7 jours est haussière (3 derniers j vs 3 premiers j). */
export function isSoilTrend7dRising(
	dailyMeans7d: (number | null)[],
	minDeltaC = YAMADORI_RISK_THRESHOLDS.soilTrend7dMinDeltaC
): boolean {
	const valid = dailyMeans7d.filter((value): value is number => value !== null);
	if (valid.length < 6) return false;

	const firstWindow = valid.slice(0, 3);
	const lastWindow = valid.slice(-3);
	const firstAvg = firstWindow.reduce((sum, value) => sum + value, 0) / firstWindow.length;
	const lastAvg = lastWindow.reduce((sum, value) => sum + value, 0) / lastWindow.length;
	return lastAvg - firstAvg > minDeltaC;
}

/** Moyenne des moyennes journalières sur N jours. */
export function meanOfDailyMeans(dailyMeans: (number | null)[]): number | null {
	const valid = dailyMeans.filter((value): value is number => value !== null);
	if (valid.length === 0) return null;
	const mean = valid.reduce((sum, value) => sum + value, 0) / valid.length;
	return Math.round(mean * 10) / 10;
}

/** Température minimale la plus basse sur les N jours de prévision à partir d'aujourd'hui. */
export function getForecastFrostMin(
	dailyTimes: string[],
	dailyMinTemps: (number | null)[],
	forecastDays: number,
	referenceDate = new Date()
): number | null {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const slice = dailyMinTemps.slice(todayIdx, todayIdx + forecastDays);
	const valid = slice.filter((value): value is number => value !== null && value !== undefined);
	if (valid.length === 0) return null;
	return Math.round(Math.min(...valid) * 10) / 10;
}

/** Somme des valeurs journalières sur les N jours complets avant aujourd'hui. */
export function sumPastDailyValues(
	dailyTimes: string[],
	dailyValues: (number | null)[],
	days: number,
	referenceDate = new Date()
): number {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const startIdx = Math.max(0, todayIdx - days);
	const slice = dailyValues.slice(startIdx, todayIdx);
	if (slice.length === 0) return 0;
	const total = slice.reduce<number>((sum, value) => sum + (value ?? 0), 0);
	return Math.round(total * 10) / 10;
}

/** Somme des valeurs journalières sur les N prochains jours à partir d'aujourd'hui. */
export function sumForecastDailyValues(
	dailyTimes: string[],
	dailyValues: (number | null)[],
	days: number,
	referenceDate = new Date()
): number {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const slice = dailyValues.slice(todayIdx, todayIdx + days);
	if (slice.length === 0) return 0;
	const total = slice.reduce<number>((sum, value) => sum + (value ?? 0), 0);
	return Math.round(total * 10) / 10;
}

/** Compte les jours passés où une condition est vraie. */
export function countPastDaysMatching(
	dailyTimes: string[],
	dailyValues: (number | null)[],
	days: number,
	predicate: (value: number) => boolean,
	referenceDate = new Date()
): number {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const startIdx = Math.max(0, todayIdx - days);
	const slice = dailyValues.slice(startIdx, todayIdx);
	return slice.filter((value) => value !== null && predicate(value)).length;
}

/** Compte les jours prévus où une condition est vraie. */
export function countForecastDaysMatching(
	dailyTimes: string[],
	dailyValues: (number | null)[],
	days: number,
	predicate: (value: number) => boolean,
	referenceDate = new Date()
): number {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const slice = dailyValues.slice(todayIdx, todayIdx + days);
	return slice.filter((value) => value !== null && predicate(value)).length;
}

/** Score de stabilité du sol 0–100 (jours stables, absence de chute, tendance 18 cm). */
export function computeSoilStabilityScore(
	data: Pick<
		AgriData,
		'soilConsecutiveStableDays' | 'soilBrutalNightDrop' | 'soilTrend7dRising'
	>,
	nightDropWeight = 1
): number {
	const { excellentMin, passableMin } = YAMADORI_RISK_THRESHOLDS.soilStableDays;
	const stableDaysScore = piecewiseLinearScore(data.soilConsecutiveStableDays, [
		{ value: 0, score: 0 },
		{ value: passableMin, score: 55 },
		{ value: excellentMin, score: 100 },
		{ value: excellentMin + 2, score: 100 }
	]);
	const nightDropScore = getSoilNightDropStabilityScore(data.soilBrutalNightDrop, nightDropWeight);
	const risingScore = data.soilTrend7dRising ? 100 : 70;
	return Math.round((stableDaysScore + nightDropScore + risingScore) / 3);
}

/** Recalcule le score de stabilité avec pondération saisonnière du malus nocturne. */
export function computeEffectiveSoilStabilityScore(
	data: Pick<
		AgriData,
		'soilConsecutiveStableDays' | 'soilBrutalNightDrop' | 'soilTrend7dRising' | 'gdd'
	>,
	inputs: YrsPlantInputs = {}
): number {
	const nightDropWeight = getSoilNightDropActivationWeight(data, inputs);
	return computeSoilStabilityScore(data, nightDropWeight);
}

/** ET₀ moyen sur les N jours complets avant aujourd'hui (mm/j). */
export function computeEt0Past7dMean(
	dailyTimes: string[],
	dailyEt0: (number | null)[],
	referenceDate = new Date(),
	days = PAST_DAYS
): number | null {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const startIdx = Math.max(0, todayIdx - days);
	const slice = dailyEt0.slice(startIdx, todayIdx);
	return meanOfDailyMeans(slice);
}

/** ET₀ moyen sur les N prochains jours à partir d'aujourd'hui (mm/j). */
export function computeEt0Trend7dMean(
	dailyTimes: string[],
	dailyEt0: (number | null)[],
	referenceDate = new Date(),
	days = FORECAST_DAYS
): number | null {
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const slice = dailyEt0.slice(todayIdx, todayIdx + days);
	return meanOfDailyMeans(slice);
}

function requireNumber(value: number | null | undefined, label: string): number {
	if (value === null || value === undefined) {
		throw new Error(m.agri_error_missing_field({ field: label }));
	}
	return value;
}

export function parseAgriForecastResponse(
	body: OpenMeteoForecastResponse,
	latitude: number,
	longitude: number,
	referenceDate = new Date()
): AgriData {
	const times = body.hourly?.time ?? [];
	const temperatures = body.hourly?.temperature_2m ?? [];
	const humidities = body.hourly?.relative_humidity_2m ?? [];
	const windSpeeds = body.hourly?.wind_speed_10m ?? [];
	const soilTemps6cm = body.hourly?.soil_temperature_6cm ?? [];
	const soilTemps18cm = body.hourly?.soil_temperature_18cm ?? [];
	const soilMoisture7cm = body.hourly?.soil_moisture_0_to_7cm ?? [];
	const shortwaveRadiation = body.hourly?.shortwave_radiation ?? [];
	const dailyTimes = body.daily?.time ?? [];
	const dailyPrecip = body.daily?.precipitation_sum ?? [];
	const dailyMinTemps = body.daily?.temperature_2m_min ?? [];
	const dailyMaxTemps = body.daily?.temperature_2m_max ?? [];
	const dailyEt0 = body.daily?.et0_fao_evapotranspiration ?? [];

	if (times.length === 0 || dailyTimes.length === 0) {
		throw new Error(m.agri_error_no_data());
	}

	const currentIndex = findCurrentHourIndex(times, referenceDate);
	const airTemperatureC = requireNumber(temperatures[currentIndex], m.agri_field_air_temp());
	const relativeHumidityPct = requireNumber(humidities[currentIndex], m.agri_field_humidity());
	const windSpeedKmh = requireNumber(windSpeeds[currentIndex], 'vitesse du vent');
	const soilTemperature6cmC = requireNumber(soilTemps6cm[currentIndex], m.agri_field_soil_6());
	const soilTemperature18cmC = requireNumber(soilTemps18cm[currentIndex], m.agri_field_soil_18());
	const soilMoisture7cmPct =
		soilMoisture7cm.length > 0
			? (() => {
					const value = soilMoisture7cm[currentIndex];
					return value !== null && value !== undefined ? Math.round(value) : null;
				})()
			: null;

	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const todayDate = dailyTimes[todayIdx] ?? formatIsoDate(referenceDate);
	const et0TodayMm = requireNumber(dailyEt0[todayIdx], 'ET₀ du jour');
	const shortwaveRadiationCurrentWm2 = requireNumber(
		shortwaveRadiation[currentIndex],
		'rayonnement solaire'
	);
	const shortwaveRadiationMaxTodayWm2 = requireNumber(
		dailyMaxForDate(times, shortwaveRadiation, todayDate),
		'rayonnement solaire max'
	);
	const past7SoilDates = dailyTimes.slice(Math.max(0, todayIdx - PAST_DAYS), todayIdx);
	const past5SoilDates = dailyTimes.slice(Math.max(0, todayIdx - SOIL_MEAN_DAYS), todayIdx);
	const pastSoilMeans6cm7d = past7SoilDates.map((date) => dailyMeanForDate(times, soilTemps6cm, date));
	const pastSoilMeans18cm7d = past7SoilDates.map((date) =>
		dailyMeanForDate(times, soilTemps18cm, date)
	);
	const pastSoilMeans5d = past5SoilDates.map((date) => dailyMeanForDate(times, soilTemps6cm, date));
	const pastSoilMins5d = past5SoilDates.map((date) => dailyMinForDate(times, soilTemps6cm, date));
	const soilDailyHistory7d: SoilDailySample[] = past7SoilDates.map((date, index) => ({
		date,
		mean6cmC: pastSoilMeans6cm7d[index] ?? null,
		mean18cmC: pastSoilMeans18cm7d[index] ?? null
	}));

	const frostMinNext7dC = getForecastFrostMin(
		dailyTimes,
		dailyMinTemps,
		FORECAST_DAYS,
		referenceDate
	);
	const frostRiskNext7d =
		frostMinNext7dC !== null &&
		frostMinNext7dC <= YAMADORI_RISK_THRESHOLDS.frostDangerousC;

	const rainPast7dMm = sumPastPrecipitation(dailyTimes, dailyPrecip, PAST_DAYS, referenceDate);
	const et0Past7dSumMm = sumPastDailyValues(dailyTimes, dailyEt0, PAST_DAYS, referenceDate);
	const et0Forecast7dSumMm = sumForecastDailyValues(
		dailyTimes,
		dailyEt0,
		FORECAST_DAYS,
		referenceDate
	);
	const waterBalance7dMm = Math.round((rainPast7dMm - et0Past7dSumMm) * 10) / 10;
	const heatStressDaysPast7d = countPastDaysMatching(
		dailyTimes,
		dailyMaxTemps,
		PAST_DAYS,
		(value) => value > 30,
		referenceDate
	);
	const heatStressDaysForecast7d = countForecastDaysMatching(
		dailyTimes,
		dailyMaxTemps,
		FORECAST_DAYS,
		(value) => value > 30,
		referenceDate
	);
	const frostEventsPast7d = countPastDaysMatching(
		dailyTimes,
		dailyMinTemps,
		PAST_DAYS,
		(value) => value < 0,
		referenceDate
	);
	const soilHeatBufferC =
		Math.round((soilTemperature6cmC - soilTemperature18cmC) * 10) / 10;
	const soilTrend7dRising = isSoilTrend7dRising(pastSoilMeans18cm7d);
	const windStressIndex = computeWindStressIndex(windSpeedKmh, relativeHumidityPct);
	const radiationStressIndex = computeRadiationStressIndex(
		shortwaveRadiationMaxTodayWm2,
		et0TodayMm
	);

	const partialData = {
		rainPast7dMm,
		soilMoisture7cmPct,
		soilTemperature18cmC: Math.round(soilTemperature18cmC * 10) / 10
	} as const;
	const soilBufferScore = computeSoilBufferScore(partialData);
	const wsi = computeWSI(waterBalance7dMm, soilBufferScore);
	const futureStressRiskMm = computeFutureStressRisk(et0Forecast7dSumMm);

	const soilBrutalNightDrop = detectBrutalNightDrop(pastSoilMeans5d, pastSoilMins5d);
	const soilConsecutiveStableDays = countConsecutiveSoilStableDays(pastSoilMeans5d);
	const soilStabilityScore = computeSoilStabilityScore({
		soilConsecutiveStableDays,
		soilBrutalNightDrop,
		soilTrend7dRising
	});

	return {
		fetchedAt: referenceDate.toISOString(),
		latitude,
		longitude,
		airTemperatureC: Math.round(airTemperatureC * 10) / 10,
		relativeHumidityPct: Math.round(relativeHumidityPct),
		windSpeedKmh: Math.round(windSpeedKmh * 10) / 10,
		et0TodayMm: Math.round(et0TodayMm * 10) / 10,
		shortwaveRadiationCurrentWm2,
		shortwaveRadiationMaxTodayWm2,
		soilTemperature6cmC: Math.round(soilTemperature6cmC * 10) / 10,
		soilTemperature18cmC: Math.round(soilTemperature18cmC * 10) / 10,
		rainPast3dMm: sumPastPrecipitation(dailyTimes, dailyPrecip, 3, referenceDate),
		rainPast5dMm: sumPastPrecipitation(dailyTimes, dailyPrecip, 5, referenceDate),
		rainPast7dMm,
		soilConsecutiveStableDays,
		soilMean5dC: meanOfDailyMeans(pastSoilMeans5d),
		soilMean6cm7dC: meanOfDailyMeans(pastSoilMeans6cm7d),
		soilMean18cm7dC: meanOfDailyMeans(pastSoilMeans18cm7d),
		soilDailyHistory7d,
		soilBrutalNightDrop,
		soilTrend7dRising,
		soilHeatBufferC,
		soilStabilityScore,
		soilMoisture7cmPct,
		frostRiskNext7d,
		frostMinNext7dC,
		et0Past7dMeanMm: computeEt0Past7dMean(dailyTimes, dailyEt0, referenceDate),
		et0Trend7dMeanMm: computeEt0Trend7dMean(dailyTimes, dailyEt0, referenceDate),
		et0Past7dSumMm,
		et0Forecast7dSumMm,
		waterBalance7dMm,
		windStressIndex,
		radiationStressIndex,
		heatStressDaysPast7d,
		heatStressDaysForecast7d,
		frostEventsPast7d,
		soilBufferScore,
		wsi,
		futureStressRiskMm,
		weeklyViability: null,
		gdd: null,
		yrs: null
	};
}

function assessWindRisk(windSpeedKmh: number): MetricRisk {
	const { passableMin, dangerousMin } = YAMADORI_RISK_THRESHOLDS.windSpeedKmh;
	if (windSpeedKmh >= dangerousMin) return 'Dangereux';
	if (windSpeedKmh >= passableMin) return 'Passable';
	return 'Excellent';
}

function assessAirTempRisk(airTempC: number): MetricRisk {
	const { dangerousLow, dangerousHigh, passableLow, passableHigh } = YAMADORI_RISK_THRESHOLDS.airTempC;
	if (airTempC < dangerousLow || airTempC > dangerousHigh) return 'Dangereux';
	if (airTempC < passableLow || airTempC > passableHigh) return 'Passable';
	return 'Excellent';
}

function assessRainPast3dRisk(rainPast3dMm: number): MetricRisk {
	const { excellentMin, excellentMax, dangerousMin } = YAMADORI_RISK_THRESHOLDS.rainPast3dMm;
	if (rainPast3dMm >= dangerousMin) return 'Dangereux';
	if (rainPast3dMm < excellentMin || rainPast3dMm > excellentMax) return 'Passable';
	return 'Excellent';
}

function assessRainPast5dRisk(rainPast5dMm: number): MetricRisk {
	if (rainPast5dMm <= YAMADORI_RISK_THRESHOLDS.rainPast5dMm.dryMm) return 'Passable';
	return 'Excellent';
}

/** Libellé de zone pour la température du sol à 18 cm. */
export function getSoil18cmZoneLabel(soilTemp18cmC: number): string {
	const { excellentMin, excellentMax, passableMax, stressMin } = YAMADORI_RISK_THRESHOLDS.soil18cmTempC;
	if (soilTemp18cmC < excellentMin) {
		return m.agri_verdict_soil_cold({ temp: String(soilTemp18cmC) });
	}
	if (soilTemp18cmC >= stressMin) {
		return m.agri_verdict_soil_high({ temp: String(soilTemp18cmC) });
	}
	if (soilTemp18cmC > excellentMax && soilTemp18cmC <= passableMax) {
		return m.agri_verdict_soil_high({ temp: String(soilTemp18cmC) });
	}
	return m.yrs_verdict_good_candidate();
}

/** Évalue le risque selon la température instantanée du sol à 18 cm. */
export function assessSoil18cmRisk(soilTemp18cmC: number): MetricRisk {
	const { excellentMin, excellentMax, stressMin } = YAMADORI_RISK_THRESHOLDS.soil18cmTempC;
	if (soilTemp18cmC < excellentMin) return 'Dangereux';
	if (soilTemp18cmC >= stressMin) return 'Passable';
	if (soilTemp18cmC > excellentMax) return 'Passable';
	return 'Excellent';
}

function assessSoilTrendRisk(data: AgriData, inputs: YrsPlantInputs = {}): MetricRisk {
	const { excellentMin, passableMin } = YAMADORI_RISK_THRESHOLDS.soilStableDays;
	const { soilConsecutiveStableDays, soilTrend7dRising } = data;

	if (soilConsecutiveStableDays < passableMin) return 'Dangereux';

	const isFullyStable = soilConsecutiveStableDays >= excellentMin;
	const nightDropBlocksExcellent = isSoilNightDropPenalized(
		data,
		inputs,
		SOIL_NIGHT_DROP_RISK_WEIGHT.excellentBlockMin
	);
	if (isFullyStable && !nightDropBlocksExcellent && soilTrend7dRising) return 'Excellent';

	return 'Passable';
}

function assessSoilRisk(data: AgriData, inputs: YrsPlantInputs = {}): MetricRisk {
	return worstRisk(assessSoilTrendRisk(data, inputs), assessSoil18cmRisk(data.soilTemperature18cmC));
}

function assessFrostRisk(frostRiskNext7d: boolean): MetricRisk {
	return frostRiskNext7d ? 'Dangereux' : 'Excellent';
}

function assessEt0TrendRisk(et0Trend7dMeanMm: number | null): MetricRisk {
	if (et0Trend7dMeanMm === null) return 'Passable';
	const { excellentMax, passableMax } = YAMADORI_RISK_THRESHOLDS.et0Trend7dMeanMm;
	if (et0Trend7dMeanMm >= passableMax) return 'Dangereux';
	if (et0Trend7dMeanMm > excellentMax) return 'Passable';
	return 'Excellent';
}

function assessRadiationRisk(shortwaveRadiationMaxTodayWm2: number): MetricRisk {
	const { passableMin, dangerousMin } = YAMADORI_RISK_THRESHOLDS.shortwaveRadiationMaxTodayWm2;
	if (shortwaveRadiationMaxTodayWm2 >= dangerousMin) return 'Dangereux';
	if (shortwaveRadiationMaxTodayWm2 >= passableMin) return 'Passable';
	return 'Excellent';
}

const RISK_PRIORITY: Record<AgriRiskLevel, number> = {
	Dangereux: 2,
	Passable: 1,
	Excellent: 0
};

function worstRisk(...risks: MetricRisk[]): AgriRiskLevel {
	return risks.reduce<AgriRiskLevel>(
		(worst, current) => (RISK_PRIORITY[current] > RISK_PRIORITY[worst] ? current : worst),
		'Excellent'
	);
}

/** Pire niveau de risque parmi plusieurs cartes fusionnées. */
export function worstAgriRisk(...risks: AgriRiskLevel[]): AgriRiskLevel {
	return worstRisk(...risks);
}

function primaryRiskReason(
	data: AgriData,
	risks: Record<string, MetricRisk>,
	inputs: YrsPlantInputs = {}
): string | null {
	if (risks.frost === 'Dangereux') {
		return m.agri_verdict_frost({ temp: String(data.frostMinNext7dC) });
	}
	if (risks.wind === 'Dangereux') {
		return m.agri_verdict_wind({ speed: String(data.windSpeedKmh) });
	}
	if (risks.air === 'Dangereux') {
		return m.agri_verdict_extreme_temp({ temp: String(data.airTemperatureC) });
	}
	if (risks.rain3d === 'Dangereux') {
		return m.agri_verdict_waterlogged({ rain: String(data.rainPast3dMm) });
	}
	if (risks.soil === 'Dangereux') {
		if (data.soilTemperature18cmC < YAMADORI_RISK_THRESHOLDS.soil18cmTempC.excellentMin) {
			return m.agri_verdict_soil_cold({ temp: String(data.soilTemperature18cmC) });
		}
		return m.agri_verdict_soil_warming({ days: String(data.soilConsecutiveStableDays) });
	}
	if (risks.radiation === 'Dangereux') {
		return m.agri_verdict_solar_risk({ rad: String(data.shortwaveRadiationMaxTodayWm2) });
	}
	if (risks.et0Past === 'Dangereux') {
		return m.agri_verdict_et0_high({ et0: String(data.et0Past7dMeanMm) });
	}
	if (risks.et0Forecast === 'Dangereux') {
		return m.agri_verdict_et0_forecast({ et0: String(data.et0Trend7dMeanMm) });
	}
	if (risks.rain5d === 'Passable' && data.rainPast5dMm <= 0) {
		return 'Sol trop sec (0 mm sur 5 jours)';
	}
	if (risks.rain3d === 'Passable') {
		return m.agri_verdict_rain_limits({ rain: String(data.rainPast3dMm) });
	}
	if (risks.soil === 'Passable') {
		if (data.soilTemperature18cmC >= YAMADORI_RISK_THRESHOLDS.soil18cmTempC.stressMin) {
			return m.agri_verdict_soil_high({ temp: String(data.soilTemperature18cmC) });
		}
		if (
			data.soilTemperature18cmC > YAMADORI_RISK_THRESHOLDS.soil18cmTempC.excellentMax &&
			data.soilTemperature18cmC < YAMADORI_RISK_THRESHOLDS.soil18cmTempC.stressMin
		) {
			return `Sol 18 cm en zone haute exploitable (${data.soilTemperature18cmC}°C)`;
		}
		if (
			isSoilNightDropPenalized(data, inputs, SOIL_NIGHT_DROP_RISK_WEIGHT.passableMin)
		) {
			return m.agri_verdict_root_fragile();
		}
		if (!data.soilTrend7dRising) {
			return m.agri_verdict_soil_stable();
		}
		return m.agri_verdict_root_awakening({ days: String(data.soilConsecutiveStableDays) });
	}
	if (risks.et0Past === 'Passable' || risks.et0Forecast === 'Passable') {
		const past =
			data.et0Past7dMeanMm !== null ? `${data.et0Past7dMeanMm} mm/j (7 j passés)` : null;
		const forecast =
			data.et0Trend7dMeanMm !== null ? `${data.et0Trend7dMeanMm} mm/j (7 j prévus)` : null;
		const detail = [past, forecast].filter(Boolean).join(' · ');
		return m.agri_verdict_hydric_stress({ detail });
	}
	if (risks.radiation === 'Passable') {
		return m.agri_verdict_moderate_sun({ rad: String(data.shortwaveRadiationMaxTodayWm2) });
	}
	if (risks.wind === 'Passable') {
		return m.agri_verdict_moderate_wind({ speed: String(data.windSpeedKmh) });
	}
	if (risks.air === 'Passable') {
		return m.agri_verdict_comfort_limited({ temp: String(data.airTemperatureC) });
	}
	return null;
}

/** Classes Tailwind des cartes métriques selon le niveau de risque. */
export const AGRI_METRIC_CARD_CLASSES: Record<AgriRiskLevel, string> = {
	Excellent: 'bg-emerald-50 border border-emerald-100',
	Passable: 'bg-orange-50 border border-orange-100',
	Dangereux: 'bg-red-50 border border-red-100'
};

export function getAgriMetricCardClass(level: AgriRiskLevel): string {
	return AGRI_METRIC_CARD_CLASSES[level];
}

function assessEt0Risk(data: AgriData): MetricRisk {
	return worstRisk(
		assessEt0TrendRisk(data.et0Past7dMeanMm),
		assessEt0TrendRisk(data.et0Trend7dMeanMm)
	);
}

/** Évalue le risque pour chaque carte du panneau agro-météo. */
export function assessYamadoriMetricRisks(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): AgriMetricRisks {
	const rain3d = assessRainPast3dRisk(data.rainPast3dMm);
	const rain5d = assessRainPast5dRisk(data.rainPast5dMm);
	return {
		air: assessAirTempRisk(data.airTemperatureC),
		wind: assessWindRisk(data.windSpeedKmh),
		soil: assessSoilRisk(data, inputs),
		rain: worstRisk(rain3d, rain5d),
		frost: assessFrostRisk(data.frostRiskNext7d),
		et0: assessEt0Risk(data),
		radiation: assessRadiationRisk(data.shortwaveRadiationMaxTodayWm2)
	};
}

function assessHydricBalanceRisk(waterBalance7dMm: number | null): MetricRisk {
	if (waterBalance7dMm === null) return 'Passable';
	if (waterBalance7dMm > 5) return 'Excellent';
	if (waterBalance7dMm >= -5) return 'Passable';
	return 'Dangereux';
}

function assessWsiRisk(wsi: number | null): MetricRisk {
	if (wsi === null) return 'Passable';
	if (wsi > 5) return 'Excellent';
	if (wsi >= -2) return 'Passable';
	return 'Dangereux';
}

function assessEt0CumulRisk(et0Forecast7dSumMm: number | null): MetricRisk {
	if (et0Forecast7dSumMm === null) return 'Passable';
	if (et0Forecast7dSumMm <= 7) return 'Excellent';
	if (et0Forecast7dSumMm <= 35) return 'Passable';
	return 'Dangereux';
}

function assessWindStressRisk(windStressIndex: number): MetricRisk {
	if (windStressIndex < 50) return 'Excellent';
	if (windStressIndex < 70) return 'Passable';
	return 'Dangereux';
}

function assessRadiationStressRisk(radiationStressIndex: number): MetricRisk {
	if (radiationStressIndex < 50) return 'Excellent';
	if (radiationStressIndex < 75) return 'Passable';
	return 'Dangereux';
}

function assessHeatStressRisk(heatDaysPast7d: number, heatDaysForecast7d: number): MetricRisk {
	const total = heatDaysPast7d + heatDaysForecast7d;
	if (total === 0) return 'Excellent';
	if (total < 3) return 'Passable';
	return 'Dangereux';
}

function assessFrostPastRisk(frostEventsPast7d: number): MetricRisk {
	if (frostEventsPast7d === 0) return 'Excellent';
	if (frostEventsPast7d === 1) return 'Passable';
	return 'Dangereux';
}

function assessGddSeasonRisk(gddCumulative: number | null): MetricRisk {
	if (gddCumulative === null) return 'Passable';
	if (gddCumulative >= 150 && gddCumulative <= 400) return 'Excellent';
	if (
		(gddCumulative >= 80 && gddCumulative < 150) ||
		(gddCumulative > 400 && gddCumulative <= 550)
	) {
		return 'Passable';
	}
	return 'Dangereux';
}

function assessSoilNightDropRisk(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): MetricRisk {
	const weight = getSoilNightDropActivationWeight(data, inputs);
	return assessSoilNightDropRiskLevel(data.soilBrutalNightDrop, weight);
}

/** Évalue le risque pour chaque indicateur détaillé affiché sous le score YRS. */
export function assessYrsDetailRisks(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YrsDetailMetricRisks {
	return {
		gddSeason: assessGddSeasonRisk(data.gdd?.cumulativeSinceJan1 ?? null),
		et0Mean: assessEt0Risk(data),
		air: assessAirTempRisk(data.airTemperatureC),
		soil: assessSoilRisk(data, inputs),
		hydricBalance: assessHydricBalanceRisk(data.waterBalance7dMm),
		wsi: assessWsiRisk(data.wsi),
		et0Cumul: assessEt0CumulRisk(data.et0Forecast7dSumMm),
		windStress: assessWindStressRisk(data.windStressIndex),
		radiationStress: assessRadiationStressRisk(data.radiationStressIndex),
		heatStress: assessHeatStressRisk(data.heatStressDaysPast7d, data.heatStressDaysForecast7d),
		frostPast: assessFrostPastRisk(data.frostEventsPast7d),
		frostForecast: assessFrostRisk(data.frostRiskNext7d),
		soilNightDrop: assessSoilNightDropRisk(data, inputs)
	};
}

/** Évalue le niveau de risque global Yamadori et le motif principal. */
export function assessYamadoriRisk(data: AgriData): AgriRiskLevel {
	return assessYamadoriRiskDetails(data).level;
}

export function assessYamadoriRiskDetails(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): YamadoriRiskAssessment {
	const metrics = assessYamadoriMetricRisks(data, inputs);
	const et0Past = assessEt0TrendRisk(data.et0Past7dMeanMm);
	const et0Forecast = assessEt0TrendRisk(data.et0Trend7dMeanMm);
	const risks = {
		wind: metrics.wind,
		air: metrics.air,
		rain3d: assessRainPast3dRisk(data.rainPast3dMm),
		rain5d: assessRainPast5dRisk(data.rainPast5dMm),
		soil: metrics.soil,
		frost: metrics.frost,
		et0Past,
		et0Forecast,
		radiation: metrics.radiation
	};

	const level = worstRisk(
		risks.wind,
		risks.air,
		risks.rain3d,
		risks.rain5d,
		risks.soil,
		risks.frost,
		et0Past,
		et0Forecast,
		risks.radiation
	);

	return {
		level,
		reason: level === 'Excellent' ? null : primaryRiskReason(data, risks, inputs)
	};
}

const RISK_LEVEL_SCORES: Record<AgriRiskLevel, number> = {
	Excellent: 100,
	Passable: 55,
	Dangereux: 0
};

/** Convertit un niveau de risque en score unitaire (0–100). */
export function riskLevelToScore(level: AgriRiskLevel): number {
	return RISK_LEVEL_SCORES[level];
}

function clampScore(score: number): number {
	return Math.max(0, Math.min(100, score));
}

/** Interpolation linéaire entre ancres {valeur → score}, clampée 0–100. */
export function piecewiseLinearScore(
	value: number,
	anchors: { value: number; score: number }[]
): number {
	if (anchors.length === 0) return 0;

	const sorted = [...anchors].sort((a, b) => a.value - b.value);
	if (value <= sorted[0].value) return clampScore(sorted[0].score);
	if (value >= sorted[sorted.length - 1].value) return clampScore(sorted[sorted.length - 1].score);

	for (let i = 0; i < sorted.length - 1; i += 1) {
		const left = sorted[i];
		const right = sorted[i + 1];
		if (value < left.value || value > right.value) continue;

		const span = right.value - left.value;
		if (span === 0) return clampScore(left.score);

		const ratio = (value - left.value) / span;
		return Math.round(clampScore(left.score + ratio * (right.score - left.score)));
	}

	return 0;
}

function scoreWindViability(windSpeedKmh: number): number {
	return piecewiseLinearScore(windSpeedKmh, [
		{ value: 0, score: 100 },
		{ value: YAMADORI_RISK_THRESHOLDS.windSpeedKmh.passableMin, score: 55 },
		{ value: YAMADORI_RISK_THRESHOLDS.windSpeedKmh.dangerousMin, score: 0 }
	]);
}

function scoreAirViability(airTempC: number): number {
	const { dangerousLow, dangerousHigh, passableLow, passableHigh } = YAMADORI_RISK_THRESHOLDS.airTempC;
	const optimal = (passableLow + passableHigh) / 2;
	return piecewiseLinearScore(airTempC, [
		{ value: dangerousLow, score: 0 },
		{ value: passableLow, score: 55 },
		{ value: optimal, score: 100 },
		{ value: passableHigh, score: 55 },
		{ value: dangerousHigh, score: 0 }
	]);
}

function scoreRain3dViability(rainPast3dMm: number): number {
	const { excellentMin, excellentMax, dangerousMin } = YAMADORI_RISK_THRESHOLDS.rainPast3dMm;
	const optimal = (excellentMin + excellentMax) / 2;
	return piecewiseLinearScore(rainPast3dMm, [
		{ value: 0, score: 55 },
		{ value: excellentMin, score: 55 },
		{ value: optimal, score: 100 },
		{ value: excellentMax, score: 55 },
		{ value: dangerousMin + 10, score: 0 }
	]);
}

function scoreRain5dViability(rainPast5dMm: number): number {
	return piecewiseLinearScore(rainPast5dMm, [
		{ value: YAMADORI_RISK_THRESHOLDS.rainPast5dMm.dryMm, score: 55 },
		{ value: 1, score: 100 }
	]);
}

function scoreFrostViability(data: AgriData): number {
	if (data.frostMinNext7dC === null) {
		return data.frostRiskNext7d ? 0 : 100;
	}

	return piecewiseLinearScore(data.frostMinNext7dC, [
		{ value: YAMADORI_RISK_THRESHOLDS.frostDangerousC, score: 0 },
		{ value: 0, score: 55 },
		{ value: 2, score: 100 }
	]);
}

function scoreEt0Viability(et0Trend7dMeanMm: number | null): number {
	if (et0Trend7dMeanMm === null) return 55;

	const { excellentMax, passableMax } = YAMADORI_RISK_THRESHOLDS.et0Trend7dMeanMm;
	return piecewiseLinearScore(et0Trend7dMeanMm, [
		{ value: 0, score: 100 },
		{ value: excellentMax, score: 55 },
		{ value: passableMax, score: 0 }
	]);
}

function scoreRadiationViability(shortwaveRadiationMaxTodayWm2: number): number {
	const { passableMin, dangerousMin } = YAMADORI_RISK_THRESHOLDS.shortwaveRadiationMaxTodayWm2;
	return piecewiseLinearScore(shortwaveRadiationMaxTodayWm2, [
		{ value: 0, score: 100 },
		{ value: passableMin, score: 55 },
		{ value: dangerousMin, score: 0 }
	]);
}

function scoreSoil18cmViability(soilTemp18cmC: number): number {
	const { excellentMin, excellentMax, stressMin } = YAMADORI_RISK_THRESHOLDS.soil18cmTempC;
	const optimal = (excellentMin + excellentMax) / 2;
	return piecewiseLinearScore(soilTemp18cmC, [
		{ value: excellentMin - 4, score: 0 },
		{ value: excellentMin, score: 55 },
		{ value: optimal, score: 100 },
		{ value: excellentMax, score: 55 },
		{ value: stressMin, score: 55 },
		{ value: stressMin + 4, score: 0 }
	]);
}

function scoreSoilTrendViability(data: AgriData, inputs: YrsPlantInputs = {}): number {
	const { excellentMin, passableMin } = YAMADORI_RISK_THRESHOLDS.soilStableDays;
	const nightDropWeight = getSoilNightDropActivationWeight(data, inputs);
	const stableDaysScore = piecewiseLinearScore(data.soilConsecutiveStableDays, [
		{ value: 0, score: 0 },
		{ value: passableMin, score: 55 },
		{ value: excellentMin, score: 100 },
		{ value: excellentMin + 2, score: 100 }
	]);
	const nightDropScore = getSoilNightDropStabilityScore(data.soilBrutalNightDrop, nightDropWeight);
	const risingScore = data.soilTrend7dRising ? 100 : 70;
	return Math.round((stableDaysScore + nightDropScore + risingScore) / 3);
}

function scoreSoilViability(data: AgriData, inputs: YrsPlantInputs = {}): number {
	const soil18cmScore = scoreSoil18cmViability(data.soilTemperature18cmC);
	const soilTrendScore = scoreSoilTrendViability(data, inputs);
	return Math.round((soil18cmScore + soilTrendScore) / 2);
}

/** Scores continus 0–100 par métrique pour la fenêtre de viabilité. */
export function computeMetricViabilityScores(
	data: AgriData,
	inputs: YrsPlantInputs = {}
): Record<keyof AgriMetricRisks, number> {
	const rain3dScore = scoreRain3dViability(data.rainPast3dMm);
	const rain5dScore = scoreRain5dViability(data.rainPast5dMm);
	return {
		air: scoreAirViability(data.airTemperatureC),
		wind: scoreWindViability(data.windSpeedKmh),
		soil: scoreSoilViability(data, inputs),
		rain: Math.min(rain3dScore, rain5dScore),
		frost: scoreFrostViability(data),
		et0: Math.min(
			scoreEt0Viability(data.et0Past7dMeanMm),
			scoreEt0Viability(data.et0Trend7dMeanMm)
		),
		radiation: scoreRadiationViability(data.shortwaveRadiationMaxTodayWm2)
	};
}

function hasDangerousMetric(metrics: AgriMetricRisks): boolean {
	return Object.values(metrics).some((level) => level === 'Dangereux');
}

function hasPassableMetric(metrics: AgriMetricRisks): boolean {
	return Object.values(metrics).some((level) => level === 'Passable');
}

/** Score de viabilité hybride pondéré (continu), plafonné à 10 si une métrique ordinale est Dangereux. */
export function computeViabilityScore(data: AgriData, inputs: YrsPlantInputs = {}): number {
	const continuous = computeMetricViabilityScores(data, inputs);
	const ordinal = assessYamadoriMetricRisks(data, inputs);
	let weightedSum = 0;
	let totalWeight = 0;

	for (const [key, weight] of Object.entries(VIABILITY_METRIC_WEIGHTS) as [
		keyof AgriMetricRisks,
		number
	][]) {
		weightedSum += continuous[key] * weight;
		totalWeight += weight;
	}

	const weighted = Math.round(weightedSum / totalWeight);
	return hasDangerousMetric(ordinal) ? Math.min(weighted, 10) : weighted;
}

/** Détermine Go / Go prudent / No-Go selon score et métriques. */
export function determineViabilityGoNoGo(score: number, metrics: AgriMetricRisks): ViabilityGoNoGo {
	if (score < VIABILITY_GO_MIN_SCORE || hasDangerousMetric(metrics)) {
		return 'No-Go';
	}
	if (score <= VIABILITY_PRUDENT_MAX_SCORE || hasPassableMetric(metrics)) {
		return 'Go prudent';
	}
	return 'Go';
}

function middayReferenceDate(isoDate: string): Date {
	return new Date(`${isoDate}T12:00:00`);
}

/** Simule les 7 prochains jours et calcule le YRS pour chacun. */
export function computeWeeklyViability(
	body: OpenMeteoForecastResponse,
	latitude: number,
	longitude: number,
	referenceDate = new Date(),
	plantInputs: YrsPlantInputs = {},
	gdd: GddSnapshot | null = null
): WeeklyViability {
	const dailyTimes = body.daily?.time ?? [];
	const todayIdx = findTodayDailyIndex(dailyTimes, referenceDate);
	const todayDate = dailyTimes[todayIdx];
	if (!todayDate) {
		throw new Error(m.agri_error_viability());
	}

	const days: ViabilityDay[] = [];
	let todayScore = 0;

	for (let offset = 0; offset < FORECAST_DAYS; offset += 1) {
		const dayDate = dailyTimes[todayIdx + offset];
		if (!dayDate) break;

		const simDate = offset === 0 ? referenceDate : middayReferenceDate(dayDate);
		const parsedDay: AgriData = {
			...parseAgriForecastResponse(body, latitude, longitude, simDate),
			weeklyViability: null,
			gdd,
			yrs: null
		};
		const { data: dayData } = applyEnvironmentExposure(
			parsedDay,
			gdd,
			plantInputs.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE
		);
		const yrs = computeYamadoriReadinessScore(dayData, plantInputs);

		if (offset === 0) {
			todayScore = yrs.score;
		}

		days.push({
			date: dayDate,
			score: yrs.score,
			yrsDecision: yrs.decision,
			deltaFromToday: 0,
			reason: yrs.summary
		});
	}

	for (const day of days) {
		day.deltaFromToday = day.score - todayScore;
	}

	let bestDayDate = todayDate;
	let bestDayScore = todayScore;
	for (const day of days) {
		if (day.score > bestDayScore) {
			bestDayScore = day.score;
			bestDayDate = day.date;
		}
	}

	return {
		days,
		todayScore,
		bestDayDate,
		bestDayScore
	};
}

export type FetchAgriDataOptions = YrsPlantInputs;

export type FetchAgriDataBaseResult = {
	baseData: AgriData;
	forecastBody: OpenMeteoForecastResponse;
};

export async function fetchAgriDataBase(
	latitude: number,
	longitude: number,
	options: FetchAgriDataOptions = {}
): Promise<FetchAgriDataBaseResult> {
	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		hourly:
			'temperature_2m,relative_humidity_2m,wind_speed_10m,soil_temperature_6cm,soil_temperature_18cm,soil_moisture_0_to_7cm,et0_fao_evapotranspiration,shortwave_radiation',
		daily: 'precipitation_sum,temperature_2m_min,temperature_2m_max,et0_fao_evapotranspiration',
		past_days: String(PAST_DAYS),
		forecast_days: String(FORECAST_DAYS),
		timezone: 'auto'
	});

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(`${FORECAST_API_URL}?${params}`, {
			signal: controller.signal
		});

		if (!response.ok) {
			throw new Error(await parseOpenMeteoErrorResponse(response));
		}

		const body = (await response.json()) as OpenMeteoForecastResponse;
		const referenceDate = new Date();

		let gdd: AgriData['gdd'] = null;
		try {
			gdd = await computeGddSnapshot(
				latitude,
				longitude,
				body,
				options.species ?? '',
				referenceDate
			);
		} catch {
			gdd = null;
		}

		const weeklyViability = null;

		const baseData: AgriData = {
			...parseAgriForecastResponse(body, latitude, longitude, referenceDate),
			weeklyViability,
			gdd,
			yrs: null
		};

		return { baseData, forecastBody: body };
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error(m.agri_error_timeout());
		}
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(m.agri_error_fetch());
	} finally {
		clearTimeout(timeoutId);
	}
}
