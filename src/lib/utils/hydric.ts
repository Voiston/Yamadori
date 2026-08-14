import type { AgriData } from '$lib/types/agri';
import { YAMADORI_RISK_THRESHOLDS } from '$lib/constants/agri-thresholds';

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Proxy FAO-56 available water capacity for a 7-day root-zone stress window (mm).
 * Editorial constant — no national soil map; documented for transparency.
 */
export const HYDRIC_AWC_MM = 40;

/** Tampon hydrique du sol (0–100) : humidité mesurée ou proxy pluie + température racinaire. */
export function computeSoilBufferScore(
	data: Pick<AgriData, 'soilMoisture7cmPct' | 'rainPast7dMm' | 'soilTemperature18cmC'>
): number {
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

	return Math.round(rainScore * 0.6 + tempFactor * 0.4);
}

/**
 * Convert soil moisture (or buffer proxy) into an mm credit against ET₀ depletion.
 * Full AWC credit at 100% moisture; 0 when unknown and no buffer.
 */
export function computeSoilMoistureCreditMm(
	data: Pick<AgriData, 'soilMoisture7cmPct' | 'rainPast7dMm' | 'soilTemperature18cmC'>,
	awcMm: number = HYDRIC_AWC_MM
): number {
	if (data.soilMoisture7cmPct !== null) {
		return round1((clamp(data.soilMoisture7cmPct, 0, 100) / 100) * awcMm);
	}
	const buffer = computeSoilBufferScore(data);
	return round1((buffer / 100) * awcMm * 0.5);
}

/**
 * FAO-style water stress coefficient Ks (0–1).
 * Depletion = max(0, ΣET₀ − rain − soilMoistureCredit); Ks = 1 − Depletion/AWC.
 */
export function computeHydricStressKs(
	et0Past7dSumMm: number | null,
	rainPast7dMm: number,
	soilMoistureCreditMm: number,
	awcMm: number = HYDRIC_AWC_MM
): number | null {
	if (et0Past7dSumMm === null) return null;
	const depletion = Math.max(0, et0Past7dSumMm - rainPast7dMm - soilMoistureCreditMm);
	return round1(clamp(1 - depletion / awcMm, 0, 1));
}

/**
 * Compat alias for archived/UI fields that still expect a "WSI-like" mm scale.
 * Maps Ks∈[0,1] → roughly [-10, +10].
 */
export function mapKsToWsiCompat(ks: number): number {
	return round1((ks - 0.5) * 20);
}

/**
 * Legacy path from water balance + buffer score → WSI compat scale.
 * Prefer computeHydricFromAgriInputs when ΣET₀ is available.
 */
export function computeWSI(
	waterBalance7dMm: number | null,
	soilBufferScore: number
): number | null {
	if (waterBalance7dMm === null) return null;
	const soilMoistureCreditMm = round1((soilBufferScore / 100) * HYDRIC_AWC_MM * 0.5);
	const depletion = Math.max(0, -waterBalance7dMm - soilMoistureCreditMm);
	const ks = clamp(1 - depletion / HYDRIC_AWC_MM, 0, 1);
	return mapKsToWsiCompat(ks);
}

/** Build Ks + compat WSI from agri hydric inputs. */
export function computeHydricFromAgriInputs(
	data: Pick<
		AgriData,
		| 'et0Past7dSumMm'
		| 'rainPast7dMm'
		| 'soilMoisture7cmPct'
		| 'soilTemperature18cmC'
		| 'waterBalance7dMm'
	>
): { soilBufferScore: number; soilMoistureCreditMm: number; hydricStressKs: number | null; wsi: number | null } {
	const soilBufferScore = computeSoilBufferScore(data);
	const soilMoistureCreditMm = computeSoilMoistureCreditMm(data);
	const hydricStressKs = computeHydricStressKs(
		data.et0Past7dSumMm,
		data.rainPast7dMm,
		soilMoistureCreditMm
	);
	const wsi =
		hydricStressKs !== null
			? mapKsToWsiCompat(hydricStressKs)
			: data.waterBalance7dMm !== null
				? computeWSI(data.waterBalance7dMm, soilBufferScore)
				: null;
	return { soilBufferScore, soilMoistureCreditMm, hydricStressKs, wsi };
}

export function computeFutureStressRisk(et0Forecast7dSumMm: number | null): number | null {
	return et0Forecast7dSumMm;
}

/** Indice composite vent sec : vitesse du vent × déficit d'humidité air (0–100). */
export function computeWindStressIndex(windSpeedKmh: number, relativeHumidityPct: number): number {
	const dryness = clamp(100 - relativeHumidityPct, 0, 100);
	const windFactor = clamp((windSpeedKmh / 40) * 100, 0, 100);
	return Math.round(windFactor * 0.6 + dryness * 0.4);
}

/** Indice composite rayonnement × demande évaporative (0–100). */
export function computeRadiationStressIndex(
	shortwaveRadiationMaxTodayWm2: number,
	et0TodayMm: number
): number {
	const radiationFactor = clamp((shortwaveRadiationMaxTodayWm2 / 700) * 100, 0, 100);
	const et0Factor = clamp((et0TodayMm / 6) * 100, 0, 100);
	return Math.round(radiationFactor * 0.55 + et0Factor * 0.45);
}
