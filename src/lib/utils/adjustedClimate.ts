import { ENVIRONMENT_EXPOSURE_COEFFICIENTS } from '$lib/constants/environment-exposure';
import type { AgriData, SoilDailySample } from '$lib/types/agri';
import type { EnvironmentExposure } from '$lib/types/environment';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import type { GddSnapshot } from '$lib/types/gdd';
import {
	countConsecutiveSoilStableDays,
	isSoilTrend7dRising
} from '$lib/utils/agri';
import { estimatePhenology } from '$lib/utils/gdd';
import {
	computeFutureStressRisk,
	computeRadiationStressIndex,
	computeSoilBufferScore,
	computeWindStressIndex,
	computeWSI
} from '$lib/utils/hydric';

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

function scaleNullable(value: number | null, coefficient: number): number | null {
	if (value === null) return null;
	return round1(value * coefficient);
}

/**
 * Atténue uniquement le réchauffement solaire (sol > air).
 * Si le sol est plus froid que l'air (ombre, printemps), on conserve la valeur API
 * pour éviter de réchauffer artificiellement la lisière / le sous-bois.
 */
export function adjustSoilTemperature(
	soilC: number,
	airC: number,
	coefficient: number
): number {
	if (coefficient >= 1 || soilC <= airC) {
		return round1(soilC);
	}
	return round1(airC + (soilC - airC) * coefficient);
}

function adjustSoilNullable(
	soilC: number | null,
	airC: number,
	coefficient: number
): number | null {
	if (soilC === null) return null;
	return adjustSoilTemperature(soilC, airC, coefficient);
}

function adjustSoilDailyHistory(
	history: SoilDailySample[],
	airC: number,
	coefficient: number
): SoilDailySample[] {
	return history.map((sample) => ({
		...sample,
		mean6cmC: adjustSoilNullable(sample.mean6cmC, airC, coefficient),
		mean18cmC: adjustSoilNullable(sample.mean18cmC, airC, coefficient)
	}));
}

function recomputeSoilTrendMetrics(
	data: Pick<
		AgriData,
		'soilDailyHistory7d' | 'soilBrutalNightDrop' | 'soilConsecutiveStableDays' | 'soilTrend7dRising'
	>
): Pick<AgriData, 'soilConsecutiveStableDays' | 'soilTrend7dRising'> {
	const past6cmMeans = data.soilDailyHistory7d.map((sample) => sample.mean6cmC);
	const past18cmMeans = data.soilDailyHistory7d.map((sample) => sample.mean18cmC);
	const past5Means6cm = past6cmMeans.slice(-5);

	return {
		soilConsecutiveStableDays:
			past5Means6cm.length > 0
				? countConsecutiveSoilStableDays(past5Means6cm)
				: data.soilConsecutiveStableDays,
		soilTrend7dRising:
			past18cmMeans.length > 0
				? isSoilTrend7dRising(past18cmMeans)
				: data.soilTrend7dRising
	};
}

export function scaleGddSnapshot(
	gdd: GddSnapshot | null,
	coefficient: number
): GddSnapshot | null {
	if (!gdd || coefficient === 1) return gdd;

	const dailySeries = gdd.dailySeries.map((point) => ({
		...point,
		dailyGdd: round1(point.dailyGdd * coefficient),
		cumulativeGdd: round1(point.cumulativeGdd * coefficient)
	}));
	const cumulativeSinceJan1 = round1(gdd.cumulativeSinceJan1 * coefficient);
	const last7dSum = round1(gdd.last7dSum * coefficient);

	const phenology = gdd.phenologyUnavailableReason
		? null
		: estimatePhenology(cumulativeSinceJan1, gdd.baseCategory);

	return {
		...gdd,
		cumulativeSinceJan1,
		last7dSum,
		dailySeries,
		phenology
	};
}

export function applyEnvironmentExposure(
	data: AgriData,
	gdd: GddSnapshot | null,
	exposure: EnvironmentExposure = DEFAULT_ENVIRONMENT_EXPOSURE
): { data: AgriData; gdd: GddSnapshot | null } {
	const coeffs = ENVIRONMENT_EXPOSURE_COEFFICIENTS[exposure];
	if (exposure === 'OPEN') {
		return { data, gdd };
	}

	const airC = data.airTemperatureC;
	const soilCoeff = coeffs.soil;

	const soilTemperature6cmC = adjustSoilTemperature(
		data.soilTemperature6cmC,
		airC,
		soilCoeff
	);
	const soilTemperature18cmC = adjustSoilTemperature(
		data.soilTemperature18cmC,
		airC,
		soilCoeff
	);
	const soilDailyHistory7d = adjustSoilDailyHistory(
		data.soilDailyHistory7d,
		airC,
		soilCoeff
	);
	const soilMean5dC = adjustSoilNullable(data.soilMean5dC, airC, soilCoeff);
	const soilMean6cm7dC = adjustSoilNullable(data.soilMean6cm7dC, airC, soilCoeff);
	const soilMean18cm7dC = adjustSoilNullable(data.soilMean18cm7dC, airC, soilCoeff);
	const soilHeatBufferC = round1(soilTemperature6cmC - soilTemperature18cmC);

	const et0TodayMm = round1(data.et0TodayMm * coeffs.et0);
	const et0Past7dMeanMm = scaleNullable(data.et0Past7dMeanMm, coeffs.et0);
	const et0Trend7dMeanMm = scaleNullable(data.et0Trend7dMeanMm, coeffs.et0);
	const et0Past7dSumMm = scaleNullable(data.et0Past7dSumMm, coeffs.et0);
	const et0Forecast7dSumMm = scaleNullable(data.et0Forecast7dSumMm, coeffs.et0);
	const windSpeedKmh = round1(data.windSpeedKmh * coeffs.wind);
	const shortwaveRadiationCurrentWm2 = round1(
		data.shortwaveRadiationCurrentWm2 * coeffs.radiation
	);
	const shortwaveRadiationMaxTodayWm2 = round1(
		data.shortwaveRadiationMaxTodayWm2 * coeffs.radiation
	);

	const partialSoilData = {
		...data,
		soilTemperature6cmC,
		soilTemperature18cmC,
		soilDailyHistory7d,
		soilMean5dC,
		soilMean6cm7dC,
		soilMean18cm7dC,
		soilHeatBufferC
	};
	const soilTrendMetrics = recomputeSoilTrendMetrics(partialSoilData);

	const waterBalance7dMm =
		et0Past7dSumMm === null
			? null
			: round1(data.rainPast7dMm - et0Past7dSumMm);
	const soilBufferScore = computeSoilBufferScore(partialSoilData);
	const wsi = computeWSI(waterBalance7dMm, soilBufferScore);
	const futureStressRiskMm = computeFutureStressRisk(et0Forecast7dSumMm);
	const windStressIndex = computeWindStressIndex(windSpeedKmh, data.relativeHumidityPct);
	const radiationStressIndex = computeRadiationStressIndex(
		shortwaveRadiationMaxTodayWm2,
		et0TodayMm
	);
	const scaledGdd = scaleGddSnapshot(gdd, coeffs.gdd);

	return {
		data: {
			...partialSoilData,
			...soilTrendMetrics,
			windSpeedKmh,
			et0TodayMm,
			et0Past7dMeanMm,
			et0Trend7dMeanMm,
			et0Past7dSumMm,
			et0Forecast7dSumMm,
			shortwaveRadiationCurrentWm2,
			shortwaveRadiationMaxTodayWm2,
			waterBalance7dMm,
			windStressIndex,
			radiationStressIndex,
			soilBufferScore,
			wsi,
			futureStressRiskMm,
			gdd: scaledGdd
		},
		gdd: scaledGdd
	};
}
