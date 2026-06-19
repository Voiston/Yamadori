import type { ClimateHistory, YearlyClimateStats } from '$lib/types/climate';

const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FETCH_TIMEOUT_MS = 15_000;
const CLIMATE_YEARS = 3;

type OpenMeteoDailyResponse = {
	daily?: {
		time?: string[];
		temperature_2m_min?: (number | null)[];
		precipitation_sum?: (number | null)[];
	};
};

export function getClimateDateRange(referenceDate = new Date()): { startDate: string; endDate: string } {
	const end = new Date(referenceDate);
	const start = new Date(referenceDate);
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

export async function fetchClimateHistory(
	latitude: number,
	longitude: number
): Promise<ClimateHistory> {
	if (!navigator.onLine) {
		throw new Error('Connexion requise pour récupérer l\'historique climatique.');
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
			throw new Error('Impossible de récupérer les données météo historiques.');
		}

		const data = (await response.json()) as OpenMeteoDailyResponse;
		const dates = data.daily?.time ?? [];
		const minTemps = data.daily?.temperature_2m_min ?? [];
		const precipitation = data.daily?.precipitation_sum ?? [];

		if (dates.length === 0) {
			throw new Error('Aucune donnée climatique disponible pour ce point.');
		}

		return aggregateClimateData(dates, minTemps, precipitation, latitude, longitude, range);
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error('La requête météo a expiré. Réessayez plus tard.');
		}
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('Erreur lors de la récupération des données climatiques.');
	} finally {
		clearTimeout(timeoutId);
	}
}
