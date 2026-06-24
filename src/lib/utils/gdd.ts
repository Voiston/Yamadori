import {
	isEvergreenSpecies,
	PHENOLOGY_LOGISTIC_PARAMS,
	getPhenologyStages,
	resolveGddBaseTemp
} from '$lib/constants/gdd-config';
import * as m from '$lib/paraglide/messages.js';
import type {
	GddDailyPoint,
	GddPhenologyEstimate,
	GddSnapshot,
	GddStageProbability,
	PhenologyStageId
} from '$lib/types/gdd';
import { dailyMeanForDate } from '$lib/utils/agri';
import { parseOpenMeteoErrorResponse } from '$lib/utils/climate';
import {
	getCachedGddArchiveDailyMeans,
	saveCachedGddArchiveDailyMeans
} from '$lib/utils/gddArchiveCache';

const ARCHIVE_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
const FETCH_TIMEOUT_MS = 15_000;
/** ERA5 reanalysis is published with ~5 days delay (Open-Meteo Archive API). */
const ARCHIVE_DELAY_DAYS = 5;

type DailyMeanTemp = { date: string; meanTempC: number | null };

type OpenMeteoArchiveDailyResponse = {
	daily?: {
		time?: string[];
		temperature_2m_mean?: (number | null)[];
	};
};

type ForecastHourlyBody = {
	hourly?: {
		time?: string[];
		temperature_2m?: (number | null)[];
	};
};

function formatIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

export function computeDailyGdd(meanTempC: number, baseTempC: number): number {
	return round1(Math.max(0, meanTempC - baseTempC));
}

function getJan1Date(referenceDate: Date): string {
	return `${referenceDate.getFullYear()}-01-01`;
}

function getArchiveEndDate(referenceDate: Date): string {
	const end = new Date(referenceDate);
	end.setDate(end.getDate() - ARCHIVE_DELAY_DAYS);
	return formatIsoDate(end);
}

export function buildGddDailySeries(
	dailyMeans: DailyMeanTemp[],
	baseTempC: number,
	referenceDate = new Date()
): GddDailyPoint[] {
	const jan1 = getJan1Date(referenceDate);
	const today = formatIsoDate(referenceDate);
	let cumulative = 0;
	const series: GddDailyPoint[] = [];

	for (const { date, meanTempC } of dailyMeans) {
		if (date < jan1 || date > today) continue;
		const dailyGdd = meanTempC !== null ? computeDailyGdd(meanTempC, baseTempC) : 0;
		cumulative = round1(cumulative + dailyGdd);
		series.push({ date, meanTempC, dailyGdd, cumulativeGdd: cumulative });
	}

	return series;
}

export function computeGddLast7dSum(
	dailySeries: GddDailyPoint[],
	referenceDate = new Date()
): number {
	const today = formatIsoDate(referenceDate);
	const completeDays = dailySeries.filter((point) => point.date < today);
	const last7 = completeDays.slice(-7);
	return round1(last7.reduce((sum, point) => sum + point.dailyGdd, 0));
}

function logisticProbability(gdd: number, midpoint: number, steepness: number): number {
	return 1 / (1 + Math.exp(-steepness * (gdd - midpoint)));
}

function cumulativeStageProbability(
	gdd: number,
	category: GddSnapshot['baseCategory'],
	stageId: PhenologyStageId
): number {
	const { midpoint, steepness } = PHENOLOGY_LOGISTIC_PARAMS[category][stageId];
	return logisticProbability(gdd, midpoint, steepness);
}

/** Sequential model: each stage occupies the GDD window between adjacent cumulative thresholds. */
function computeSequentialStageProbabilities(
	gdd: number,
	category: GddSnapshot['baseCategory']
): GddStageProbability[] {
	const stages = getPhenologyStages();
	const cumulative = stages.map((stage) =>
		cumulativeStageProbability(gdd, category, stage.id)
	);
	const fractions = [
		1 - cumulative[1],
		cumulative[1] - cumulative[2],
		cumulative[2] - cumulative[3],
		cumulative[3] - cumulative[4],
		cumulative[4]
	];

	return stages.map((stage, index) => ({
		id: stage.id,
		label: stage.label,
		probabilityPct: Math.max(0, Math.round(fractions[index] * 100))
	}));
}

export function estimatePhenology(
	cumulativeGdd: number,
	category: GddSnapshot['baseCategory']
): GddPhenologyEstimate {
	const stages = computeSequentialStageProbabilities(cumulativeGdd, category);
	const transitionLabel = buildTransitionLabel(stages);

	return {
		transitionLabel,
		stages,
		disclaimer: m.gdd_probabilistic_disclaimer()
	};
}

export function buildTransitionLabel(stages: GddStageProbability[]): string {
	const sorted = [...stages].sort((a, b) => b.probabilityPct - a.probabilityPct);
	const dominant = sorted[0];
	if (!dominant) return m.gdd_indeterminate();

	if (dominant.probabilityPct > 80) {
		const stageMeta = getPhenologyStages().find((s) => s.id === dominant.id);
		return stageMeta?.label ?? dominant.label;
	}

	const phenologyStages = getPhenologyStages();
	const dominantIndex = phenologyStages.findIndex((s) => s.id === dominant.id);
	const nextStage = phenologyStages[dominantIndex + 1];
	if (!nextStage) {
		return dominant.label;
	}

	const nextProbability = stages.find((s) => s.id === nextStage.id)?.probabilityPct ?? 0;
	if (nextProbability > 20) {
		const fromLabel =
			phenologyStages.find((s) => s.id === dominant.id)?.shortLabel ?? dominant.label;
		const toLabel = nextStage.shortLabel;
		return m.gdd_transition({ from: fromLabel, to: toLabel });
	}

	return dominant.label;
}

export function mergeDailyMeanTemps(
	archiveMeans: DailyMeanTemp[],
	forecastMeans: DailyMeanTemp[]
): DailyMeanTemp[] {
	const byDate = new Map<string, number | null>();

	for (const point of archiveMeans) {
		byDate.set(point.date, point.meanTempC);
	}
	for (const point of forecastMeans) {
		byDate.set(point.date, point.meanTempC);
	}

	return [...byDate.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, meanTempC]) => ({ date, meanTempC }));
}

export function extractForecastDailyMeans(
	body: ForecastHourlyBody,
	referenceDate = new Date()
): DailyMeanTemp[] {
	const hourlyTimes = body.hourly?.time ?? [];
	const temps = body.hourly?.temperature_2m ?? [];
	if (hourlyTimes.length === 0) return [];

	const jan1 = getJan1Date(referenceDate);
	const today = formatIsoDate(referenceDate);
	const dates = new Set<string>();

	for (const time of hourlyTimes) {
		const date = time.slice(0, 10);
		if (date >= jan1 && date <= today) {
			dates.add(date);
		}
	}

	return [...dates]
		.sort()
		.map((date) => ({
			date,
			meanTempC: dailyMeanForDate(hourlyTimes, temps, date)
		}));
}

async function fetchArchiveDailyMeans(
	latitude: number,
	longitude: number,
	startDate: string,
	endDate: string
): Promise<DailyMeanTemp[]> {
	const cached = await getCachedGddArchiveDailyMeans(latitude, longitude, startDate, endDate);
	if (cached) {
		return cached;
	}

	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		start_date: startDate,
		end_date: endDate,
		daily: 'temperature_2m_mean',
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

		const data = (await response.json()) as OpenMeteoArchiveDailyResponse;
		const dates = data.daily?.time ?? [];
		const means = data.daily?.temperature_2m_mean ?? [];

		const dailyMeans = dates.map((date, index) => ({
			date,
			meanTempC: means[index] ?? null
		}));

		await saveCachedGddArchiveDailyMeans(
			latitude,
			longitude,
			startDate,
			endDate,
			dailyMeans
		);

		return dailyMeans;
	} finally {
		clearTimeout(timeoutId);
	}
}

export async function fetchDailyMeanTempsSinceJan1(
	latitude: number,
	longitude: number,
	forecastBody: ForecastHourlyBody,
	referenceDate = new Date()
): Promise<DailyMeanTemp[]> {
	const jan1 = getJan1Date(referenceDate);
	const archiveEnd = getArchiveEndDate(referenceDate);
	const forecastMeans = extractForecastDailyMeans(forecastBody, referenceDate);

	if (jan1 > archiveEnd) {
		return forecastMeans;
	}

	const archiveMeans = await fetchArchiveDailyMeans(latitude, longitude, jan1, archiveEnd);
	return mergeDailyMeanTemps(archiveMeans, forecastMeans);
}

export async function computeGddSnapshot(
	latitude: number,
	longitude: number,
	forecastBody: ForecastHourlyBody,
	species = '',
	referenceDate = new Date()
): Promise<GddSnapshot> {
	const trimmedSpecies = species.trim();
	const { baseTempC, category } = resolveGddBaseTemp(trimmedSpecies, latitude, longitude);
	const dailyMeans = await fetchDailyMeanTempsSinceJan1(
		latitude,
		longitude,
		forecastBody,
		referenceDate
	);
	const dailySeries = buildGddDailySeries(dailyMeans, baseTempC, referenceDate);
	const cumulativeSinceJan1 =
		dailySeries.length > 0 ? dailySeries[dailySeries.length - 1].cumulativeGdd : 0;
	const last7dSum = computeGddLast7dSum(dailySeries, referenceDate);

	const evergreen = trimmedSpecies ? isEvergreenSpecies(trimmedSpecies) : false;
	const phenology = evergreen ? null : estimatePhenology(cumulativeSinceJan1, category);
	const phenologyUnavailableReason = evergreen ? m.gdd_evergreen_reason() : null;

	return {
		baseTempC,
		baseCategory: category,
		cumulativeSinceJan1,
		last7dSum,
		dailySeries,
		phenology,
		phenologyUnavailableReason,
		speciesLabel: trimmedSpecies || null
	};
}

/** Exported for tests — compute phenology stage probability for a given stage. */
export function getStageProbabilityAtGdd(
	gdd: number,
	category: GddSnapshot['baseCategory'],
	stageId: PhenologyStageId
): number {
	const stages = computeSequentialStageProbabilities(gdd, category);
	return stages.find((stage) => stage.id === stageId)?.probabilityPct ?? 0;
}
