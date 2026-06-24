import * as m from '$lib/paraglide/messages.js';
import type { ClimateHistory, YearlyClimateStats } from '$lib/types/climate';
import {
	getCachedClimateHistory,
	saveCachedClimateHistory
} from '$lib/utils/climateCache';

const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FETCH_TIMEOUT_MS = 15_000;
const CLIMATE_YEARS = 3;
/** ERA5 reanalysis is published with ~5 days delay (Open-Meteo Archive API). */
const ARCHIVE_DELAY_DAYS = 5;

type OpenMeteoDailyResponse = {
	daily?: {
		time?: string[];
		temperature_2m_min?: (number | null)[];
		precipitation_sum?: (number | null)[];
	};
};

type OpenMeteoErrorResponse = {
	error?: boolean;
	reason?: string;
};

export function getClimateDateRange(referenceDate = new Date()): { startDate: string; endDate: string } {
	const end = new Date(referenceDate);
	end.setDate(end.getDate() - ARCHIVE_DELAY_DAYS);

	const start = new Date(end);
	start.setFullYear(start.getFullYear() - CLIMATE_YEARS);

	return {
		startDate: formatIsoDate(start),
		endDate: formatIsoDate(end)
	};
}

function formatIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

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

export async function parseOpenMeteoErrorResponse(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as OpenMeteoErrorResponse;
		if (body.reason) {
			return m.open_meteo_error({ status: String(response.status), reason: body.reason });
		}
	} catch {
		// ignore JSON parse errors
	}
	return m.open_meteo_error({
		status: String(response.status),
		reason: m.climate_error_historical()
	});
}

export async function fetchClimateHistory(
	latitude: number,
	longitude: number
): Promise<ClimateHistory> {
	const cached = await getCachedClimateHistory(latitude, longitude);
	if (cached) {
		return cached;
	}

	const range = getClimateDateRange();
	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		start_date: range.startDate,
		end_date: range.endDate,
		daily: 'temperature_2m_min,precipitation_sum',
		timezone: 'auto'
	});

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(`${ARCHIVE_API_URL}?${params}`, {
			signal: controller.signal
		});

		if (!response.ok) {
			throw new Error(await parseOpenMeteoErrorResponse(response));
		}

		const data = (await response.json()) as OpenMeteoDailyResponse;
		const dates = data.daily?.time ?? [];
		const minTemps = data.daily?.temperature_2m_min ?? [];
		const precipitation = data.daily?.precipitation_sum ?? [];

		if (dates.length === 0) {
			throw new Error(m.climate_error_no_data());
		}

		const history = aggregateClimateData(
			dates,
			minTemps,
			precipitation,
			latitude,
			longitude,
			range
		);
		await saveCachedClimateHistory(latitude, longitude, history);
		return history;
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error(m.agri_error_timeout());
		}
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(m.climate_error_fetch());
	} finally {
		clearTimeout(timeoutId);
	}
}
