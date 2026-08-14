import * as m from '$lib/paraglide/messages.js';
import { createTimedAbortSignal } from '$lib/utils/abortSignal';
import { getApiDisabledError, isApiEnabled } from '$lib/utils/apiPolicy';
import { regionalApiCoordinates } from '$lib/utils/geo';
import { createInFlightMap } from '$lib/utils/inFlight';
import {
	getCachedGddArchiveDailyMeans,
	saveCachedGddArchiveDailyMeans,
	type GddArchiveDailyMean
} from '$lib/utils/gddArchiveCache';

const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FETCH_TIMEOUT_MS = 15_000;
const CLIMATE_YEARS = 3;
/** ERA5 reanalysis is published with ~5 days delay (Open-Meteo Archive API). */
const ARCHIVE_DELAY_DAYS = 5;

export type OpenMeteoArchiveDailyBundle = {
	time: string[];
	temperature_2m_min: (number | null)[];
	precipitation_sum: (number | null)[];
	temperature_2m_mean: (number | null)[];
};

type OpenMeteoErrorResponse = {
	error?: boolean;
	reason?: string;
};

const archiveInFlight = createInFlightMap<OpenMeteoArchiveDailyBundle>();

function formatIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function getClimateDateRange(referenceDate = new Date()): {
	startDate: string;
	endDate: string;
} {
	const end = new Date(referenceDate);
	end.setDate(end.getDate() - ARCHIVE_DELAY_DAYS);

	const start = new Date(end);
	start.setFullYear(start.getFullYear() - CLIMATE_YEARS);

	return {
		startDate: formatIsoDate(start),
		endDate: formatIsoDate(end)
	};
}

export function getArchiveEndDate(referenceDate = new Date()): string {
	const end = new Date(referenceDate);
	end.setDate(end.getDate() - ARCHIVE_DELAY_DAYS);
	return formatIsoDate(end);
}

export function getJan1Date(referenceDate = new Date()): string {
	return `${referenceDate.getFullYear()}-01-01`;
}

/**
 * Agro-season start for GDD accumulation:
 * - Northern hemisphere (lat ≥ 0): 1 January of the current calendar year
 * - Southern hemisphere (lat < 0): 1 July of the current austral agro year
 *   (Jan–Jun → previous year's 1 July)
 */
export function getGddSeasonStartDate(referenceDate = new Date(), latitude = 0): string {
	if (latitude >= 0) {
		return getJan1Date(referenceDate);
	}
	const year = referenceDate.getFullYear();
	const month = referenceDate.getMonth(); // 0-based
	if (month < 6) {
		return `${year - 1}-07-01`;
	}
	return `${year}-07-01`;
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

function archiveKey(latitude: number, longitude: number, startDate: string, endDate: string): string {
	return `${latitude.toFixed(2)}_${longitude.toFixed(2)}|${startDate}|${endDate}`;
}

type RawArchiveResponse = {
	daily?: {
		time?: string[];
		temperature_2m_min?: (number | null)[];
		precipitation_sum?: (number | null)[];
		temperature_2m_mean?: (number | null)[];
	};
};

/**
 * Single Open-Meteo archive request for climate + GDD daily fields (in-flight coalesced).
 */
export async function fetchOpenMeteoArchiveDailyBundle(
	latitude: number,
	longitude: number,
	startDate: string,
	endDate: string,
	options?: { signal?: AbortSignal }
): Promise<OpenMeteoArchiveDailyBundle> {
	const { latitude: apiLat, longitude: apiLon } = regionalApiCoordinates(latitude, longitude);
	const key = archiveKey(apiLat, apiLon, startDate, endDate);

	return archiveInFlight.run(key, async () => {
		if (!isApiEnabled('openMeteoArchive')) {
			throw new Error(getApiDisabledError('openMeteoArchive'));
		}

		const params = new URLSearchParams({
			latitude: String(apiLat),
			longitude: String(apiLon),
			start_date: startDate,
			end_date: endDate,
			daily: 'temperature_2m_min,precipitation_sum,temperature_2m_mean',
			timezone: 'auto'
		});

		const { signal, dispose } = createTimedAbortSignal(FETCH_TIMEOUT_MS, options?.signal);

		try {
			const response = await fetch(`${ARCHIVE_API_URL}?${params}`, { signal });
			if (!response.ok) {
				throw new Error(await parseOpenMeteoErrorResponse(response));
			}

			const data = (await response.json()) as RawArchiveResponse;
			const time = data.daily?.time ?? [];
			if (time.length === 0) {
				throw new Error(m.climate_error_no_data());
			}

			const bundle: OpenMeteoArchiveDailyBundle = {
				time,
				temperature_2m_min: data.daily?.temperature_2m_min ?? [],
				precipitation_sum: data.daily?.precipitation_sum ?? [],
				temperature_2m_mean: data.daily?.temperature_2m_mean ?? []
			};

			const jan1 = getJan1Date();
			const archiveEnd = getArchiveEndDate();
			if (startDate <= jan1 && endDate >= archiveEnd) {
				const dailyMeans: GddArchiveDailyMean[] = [];
				for (let i = 0; i < bundle.time.length; i++) {
					const date = bundle.time[i];
					if (date < jan1 || date > archiveEnd) continue;
					dailyMeans.push({
						date,
						meanTempC: bundle.temperature_2m_mean[i] ?? null
					});
				}
				await saveCachedGddArchiveDailyMeans(apiLat, apiLon, jan1, archiveEnd, dailyMeans);
			}

			return bundle;
		} finally {
			dispose();
		}
	});
}

/**
 * GDD means since agro-season start (1 Jan NH / 1 Jul SH): prefer IDB, else climate-range bundle.
 */
export async function fetchGddArchiveDailyMeans(
	latitude: number,
	longitude: number,
	referenceDate = new Date(),
	options?: { signal?: AbortSignal }
): Promise<GddArchiveDailyMean[]> {
	const { latitude: apiLat, longitude: apiLon } = regionalApiCoordinates(latitude, longitude);
	const seasonStart = getGddSeasonStartDate(referenceDate, latitude);
	const archiveEnd = getArchiveEndDate(referenceDate);

	if (seasonStart > archiveEnd) {
		return [];
	}

	const cached = await getCachedGddArchiveDailyMeans(apiLat, apiLon, seasonStart, archiveEnd);
	if (cached) {
		return cached;
	}

	const climateRange = getClimateDateRange(referenceDate);
	const bundle = await fetchOpenMeteoArchiveDailyBundle(
		apiLat,
		apiLon,
		climateRange.startDate,
		climateRange.endDate,
		options
	);

	const dailyMeans: GddArchiveDailyMean[] = [];
	for (let i = 0; i < bundle.time.length; i++) {
		const date = bundle.time[i];
		if (date < seasonStart || date > archiveEnd) continue;
		dailyMeans.push({
			date,
			meanTempC: bundle.temperature_2m_mean[i] ?? null
		});
	}

	await saveCachedGddArchiveDailyMeans(apiLat, apiLon, seasonStart, archiveEnd, dailyMeans);
	return dailyMeans;
}
