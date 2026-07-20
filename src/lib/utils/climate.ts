import * as m from '$lib/paraglide/messages.js';
import type { ClimateHistory, YearlyClimateStats } from '$lib/types/climate';
import {
	getCachedClimateHistory,
	saveCachedClimateHistory
} from '$lib/utils/climateCache';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import { regionalApiCoordinates } from '$lib/utils/geo';
import { createInFlightMap } from '$lib/utils/inFlight';
import {
	fetchOpenMeteoArchiveDailyBundle,
	getClimateDateRange,
	parseOpenMeteoErrorResponse
} from '$lib/utils/openMeteoArchive';

export { getClimateDateRange, parseOpenMeteoErrorResponse };

const climateInFlight = createInFlightMap<ClimateHistory>();

export function aggregateClimateData(
	dates: string[],
	minTemps: (number | null)[],
	precipitation: (number | null)[],
	latitude: number,
	longitude: number,
	range: { startDate: string; endDate: string }
): ClimateHistory {
	const yearlyMap = new Map<number, { precipitationMm: number; frostDays: number }>();
	let absoluteMinTempC = Infinity;

	for (let i = 0; i < dates.length; i++) {
		const date = dates[i];
		const year = Number(date.slice(0, 4));
		const minTemp = minTemps[i];
		const precip = precipitation[i] ?? 0;

		if (minTemp !== null && minTemp < absoluteMinTempC) {
			absoluteMinTempC = minTemp;
		}

		const entry = yearlyMap.get(year) ?? { precipitationMm: 0, frostDays: 0 };
		entry.precipitationMm += precip;
		if (minTemp !== null && minTemp < 0) {
			entry.frostDays += 1;
		}
		yearlyMap.set(year, entry);
	}

	const yearlyStats: YearlyClimateStats[] = [...yearlyMap.entries()]
		.sort(([a], [b]) => a - b)
		.map(([year, stats]) => ({
			year,
			precipitationMm: Math.round(stats.precipitationMm),
			frostDays: stats.frostDays
		}));

	const avgAnnualPrecipitationMm =
		yearlyStats.length > 0
			? Math.round(
					yearlyStats.reduce((sum, year) => sum + year.precipitationMm, 0) / yearlyStats.length
				)
			: 0;

	const avgFrostDaysPerYear =
		yearlyStats.length > 0
			? Math.round(yearlyStats.reduce((sum, year) => sum + year.frostDays, 0) / yearlyStats.length)
			: 0;

	return {
		fetchedAt: new Date().toISOString(),
		startDate: range.startDate,
		endDate: range.endDate,
		latitude,
		longitude,
		absoluteMinTempC: absoluteMinTempC === Infinity ? 0 : Math.round(absoluteMinTempC * 10) / 10,
		yearlyStats,
		avgAnnualPrecipitationMm,
		avgFrostDaysPerYear
	};
}

export async function fetchClimateHistory(
	latitude: number,
	longitude: number,
	options?: { signal?: AbortSignal }
): Promise<ClimateHistory> {
	const { latitude: apiLat, longitude: apiLon } = regionalApiCoordinates(latitude, longitude);
	const cached = await getCachedClimateHistory(apiLat, apiLon);
	if (cached) {
		return cached;
	}

	if (!isApiEnabled('openMeteoArchive')) {
		throw new Error(getApiDisabledError('openMeteoArchive'));
	}

	const range = getClimateDateRange();
	const inflightKey = `${apiLat.toFixed(2)}_${apiLon.toFixed(2)}`;

	return climateInFlight.run(inflightKey, async () => {
		const cachedAgain = await getCachedClimateHistory(apiLat, apiLon);
		if (cachedAgain) {
			return cachedAgain;
		}

		try {
			const bundle = await fetchOpenMeteoArchiveDailyBundle(
				apiLat,
				apiLon,
				range.startDate,
				range.endDate,
				options
			);

			const history = aggregateClimateData(
				bundle.time,
				bundle.temperature_2m_min,
				bundle.precipitation_sum,
				apiLat,
				apiLon,
				range
			);
			await saveCachedClimateHistory(apiLat, apiLon, history);
			return history;
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				throw new Error(m.agri_error_timeout());
			}
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(m.climate_error_fetch());
		}
	});
}
