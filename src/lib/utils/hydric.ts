import type { AgriData } from '$lib/types/agri';
import { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/** Tampon hydrique du sol : humidité mesurée ou proxy pluie + température racinaire. */
export function computeSoilBufferScore(data: Pick<
	AgriData,
	'soilMoisture7cmPct' | 'rainPast7dMm' | 'soilTemperature18cmC'
>): number {
	if (data.soilMoisture7cmPct !== null) {
		return clamp(Math.round(data.soilMoisture7cmPct), 0, 100);
	}

	const rainScore = clamp(Math.round((data.rainPast7dMm / 30) * 100), 0, 100);
	const { excellentMin, excellentMax } = YAMADORI_RISK_THRESHOLDS.soil18cmTempC;
	const soilTemp = data.soilTemperature18cmC;

	let tempFactor = 50;
	if (soilTemp >= excellentMin && soilTemp <= excellentMax) {
		tempFactor = 80;
	} else if (soilTemp < excellentMin) {
		tempFactor = 30;
	} else if (soilTemp >= YAMADORI_RISK_THRESHOLDS.soil18cmTempC.stressMin) {
		tempFactor = 25;
	}

	return Math.round((rainScore * 0.6 + tempFactor * 0.4));
}

/** WSI = bilan hydrique 7 j + contribution tampon sol (échelle mm équivalent). */
export function computeWSI(
	waterBalance7dMm: number | null,
	soilBufferScore: number
): number | null {
	if (waterBalance7dMm === null) return null;
	const bufferContribution = round1((soilBufferScore / 100) * 10);
	return round1(waterBalance7dMm + bufferContribution);
}

export function computeFutureStressRisk(et0Forecast7dSumMm: number | null): number | null {
	return et0Forecast7dSumMm;
}

/** Indice composite vent sec : vitesse du vent × déficit d'humidité air (0–100). */
export function computeWindStressIndex(windSpeedKmh: number, relativeHumidityPct: number): number {
	const dryness = clamp(100 - relativeHumidityPct, 0, 100);
	const windFactor = clamp((windSpeedKmh / 40) * 100, 0, 100);
	return Math.round((windFactor * 0.6 + dryness * 0.4));
}

/** Indice composite rayonnement × demande évaporative (0–100). */
export function computeRadiationStressIndex(
	shortwaveRadiationMaxTodayWm2: number,
	et0TodayMm: number
): number {
	const radiationFactor = clamp((shortwaveRadiationMaxTodayWm2 / 700) * 100, 0, 100);
	const et0Factor = clamp((et0TodayMm / 6) * 100, 0, 100);
	return Math.round((radiationFactor * 0.55 + et0Factor * 0.45));
}
