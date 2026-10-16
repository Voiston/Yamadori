import { ENVIRONMENT_EXPOSURE_COEFFICIENTS } from '$lib/constants/environment-exposure';
import type { AgriData } from '$lib/types/agri';
import type { EnvironmentExposure } from '$lib/types/environment';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import type { GddSnapshot } from '$lib/types/gdd';
import { refreshSnapshotPhenology } from '$lib/utils/gdd';
import {
	computeFutureStressRisk,
	computeHydricFromAgriInputs,
	computeRadiationStressIndex,
	computeWindStressIndex
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

export function scaleGddSnapshot(
	gdd: GddSnapshot | null,
	coefficient: number,
	context?: { latitude: number; referenceDate: Date }
): GddSnapshot | null {
	if (!gdd || coefficient === 1) return gdd;

	const dailySeries = gdd.dailySeries.map((point) => ({
		...point,
		dailyGdd: round1(point.dailyGdd * coefficient),
		cumulativeGdd: round1(point.cumulativeGdd * coefficient)
	}));
	const cumulativeSinceJan1 = round1(gdd.cumulativeSinceJan1 * coefficient);
	const last7dSum = round1(gdd.last7dSum * coefficient);
	const phenologyFields = refreshSnapshotPhenology(gdd, cumulativeSinceJan1, {
		latitude: context?.latitude,
		referenceDate: context?.referenceDate
	});

	return {
		...gdd,
		cumulativeSinceJan1,
		last7dSum,
		dailySeries,
		...phenologyFields
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
	const soilMean6cm7dC =
		data.soilMean6cm7dC === null
			? null
			: adjustSoilTemperature(data.soilMean6cm7dC, airC, soilCoeff);
	const soilMean18cm7dC =
		data.soilMean18cm7dC === null
			? null
			: adjustSoilTemperature(data.soilMean18cm7dC, airC, soilCoeff);
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
		soilMean6cm7dC,
		soilMean18cm7dC,
		soilHeatBufferC
	};

	const waterBalance7dMm =
		et0Past7dSumMm === null
			? null
			: round1(data.rainPast7dMm - et0Past7dSumMm);
	const { soilBufferScore, hydricStressKs, wsi } = computeHydricFromAgriInputs({
		et0Past7dSumMm,
		rainPast7dMm: data.rainPast7dMm,
		soilMoisture7cmPct: data.soilMoisture7cmPct,
		soilTemperature18cmC,
		waterBalance7dMm
	});
	const futureStressRiskMm = computeFutureStressRisk(et0Forecast7dSumMm);
	const windStressIndex = computeWindStressIndex(windSpeedKmh, data.relativeHumidityPct);
	const radiationStressIndex = computeRadiationStressIndex(
		shortwaveRadiationMaxTodayWm2,
		et0TodayMm
	);
	const scaledGdd = scaleGddSnapshot(gdd, coeffs.gdd, {
		latitude: data.latitude,
		referenceDate: data.fetchedAt ? new Date(data.fetchedAt) : new Date()
	});

	return {
		data: {
			...partialSoilData,
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
			hydricStressKs,
			wsi,
			futureStressRiskMm,
			gdd: scaledGdd
		},
		gdd: scaledGdd
	};
}
