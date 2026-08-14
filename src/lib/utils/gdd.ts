import {
	isEvergreenSpecies,
	getPhenologyStages,
	resolveGddBaseTemp
} from '$lib/constants/gdd-config';
import {
	resolvePhenologyLogisticParams,
	resolveSpeciesGddProfile
} from '$lib/constants/species-gdd-profiles';
import * as m from '$lib/paraglide/messages.js';
import type {
	GddDailyPoint,
	GddPhenologyEstimate,
	GddPhenologyStageId,
	GddSnapshot,
	GddStageProbability
} from '$lib/types/gdd';
import { dailyMeanForDate } from '$lib/utils/agri';
import {
	fetchGddArchiveDailyMeans,
	getArchiveEndDate,
	getGddSeasonStartDate
} from '$lib/utils/openMeteoArchive';

type DailyMeanTemp = { date: string; meanTempC: number | null };

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

export function buildGddDailySeries(
	dailyMeans: DailyMeanTemp[],
	baseTempC: number,
	referenceDate = new Date(),
	latitude = 0
): GddDailyPoint[] {
	const seasonStart = getGddSeasonStartDate(referenceDate, latitude);
	const today = formatIsoDate(referenceDate);
	let cumulative = 0;
	const series: GddDailyPoint[] = [];

	for (const { date, meanTempC } of dailyMeans) {
		if (date < seasonStart || date > today) continue;
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
	stageId: GddPhenologyStageId,
	species?: string | null
): number {
	const { midpoint, steepness } = resolvePhenologyLogisticParams(category, species)[stageId];
	return logisticProbability(gdd, midpoint, steepness);
}

/** Sequential model: each stage occupies the GDD window between adjacent cumulative thresholds. */
function computeSequentialStageProbabilities(
	gdd: number,
	category: GddSnapshot['baseCategory'],
	species?: string | null
): GddStageProbability[] {
	const stages = getPhenologyStages();
	const cumulative = stages.map((stage) =>
		cumulativeStageProbability(gdd, category, stage.id, species)
	);
	const lastIndex = stages.length - 1;
	const fractions = stages.map((_, index) => {
		if (index === 0) return 1 - (cumulative[1] ?? 0);
		if (index === lastIndex) return cumulative[index] ?? 0;
		return (cumulative[index] ?? 0) - (cumulative[index + 1] ?? 0);
	});

	return stages.map((stage, index) => ({
		id: stage.id,
		label: stage.label,
		probabilityPct: Math.max(0, Math.round(fractions[index] * 100))
	}));
}

export function estimatePhenology(
	cumulativeGdd: number,
	category: GddSnapshot['baseCategory'],
	species?: string | null
): GddPhenologyEstimate {
	const stages = computeSequentialStageProbabilities(cumulativeGdd, category, species);
	const transitionLabel = buildTransitionLabel(stages);

	return {
		transitionLabel,
		stages,
		disclaimer: m.gdd_probabilistic_disclaimer()
	};
}

/**
 * Advance a GDD snapshot by summing daily GDD for forecast days after `fromDate` through `throughDate`.
 * Used by weekly viability so phenology/climate layers progress across the chart.
 */
export function projectGddSnapshotForward(
	gdd: GddSnapshot,
	dailyMeanTemps: readonly { date: string; meanTempC: number | null }[],
	fromDate: string,
	throughDate: string,
	options: { refreshPhenology?: boolean } = {}
): GddSnapshot {
	const { refreshPhenology = true } = options;
	if (throughDate <= fromDate) {
		return gdd;
	}

	let added = 0;
	const meansByDate = new Map(dailyMeanTemps.map((row) => [row.date, row.meanTempC]));
	for (const { date, meanTempC } of dailyMeanTemps) {
		if (date <= fromDate || date > throughDate) continue;
		const temp = meanTempC ?? meansByDate.get(date) ?? null;
		if (temp === null) continue;
		added = round1(added + computeDailyGdd(temp, gdd.baseTempC));
	}

	const cumulativeSinceJan1 = round1(gdd.cumulativeSinceJan1 + added);
	const evergreen = Boolean(gdd.phenologyUnavailableReason);
	const phenology =
		refreshPhenology && !evergreen
			? estimatePhenology(cumulativeSinceJan1, gdd.baseCategory, gdd.speciesLabel)
			: gdd.phenology;

	return {
		...gdd,
		cumulativeSinceJan1,
		phenology
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
	referenceDate = new Date(),
	latitude = 0
): DailyMeanTemp[] {
	const hourlyTimes = body.hourly?.time ?? [];
	const temps = body.hourly?.temperature_2m ?? [];
	if (hourlyTimes.length === 0) return [];

	const seasonStart = getGddSeasonStartDate(referenceDate, latitude);
	const today = formatIsoDate(referenceDate);
	const dates = new Set<string>();

	for (const time of hourlyTimes) {
		const date = time.slice(0, 10);
		if (date >= seasonStart && date <= today) {
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
	_startDate: string,
	_endDate: string,
	referenceDate = new Date()
): Promise<DailyMeanTemp[]> {
	return fetchGddArchiveDailyMeans(latitude, longitude, referenceDate);
}

/** Daily means since agro-season start (1 Jan NH / 1 Jul SH). */
export async function fetchDailyMeanTempsSinceJan1(
	latitude: number,
	longitude: number,
	forecastBody: ForecastHourlyBody,
	referenceDate = new Date()
): Promise<DailyMeanTemp[]> {
	const seasonStart = getGddSeasonStartDate(referenceDate, latitude);
	const archiveEnd = getArchiveEndDate(referenceDate);
	const forecastMeans = extractForecastDailyMeans(forecastBody, referenceDate, latitude);

	if (seasonStart > archiveEnd) {
		return forecastMeans;
	}

	const archiveMeans = await fetchArchiveDailyMeans(
		latitude,
		longitude,
		seasonStart,
		archiveEnd,
		referenceDate
	);
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
	const profile = resolveSpeciesGddProfile(trimmedSpecies);
	const resolved = resolveGddBaseTemp(trimmedSpecies, latitude, longitude);
	const category = profile?.category ?? resolved.category;
	const baseTempC = profile?.baseTempC ?? resolved.baseTempC;
	const dailyMeans = await fetchDailyMeanTempsSinceJan1(
		latitude,
		longitude,
		forecastBody,
		referenceDate
	);
	const dailySeries = buildGddDailySeries(dailyMeans, baseTempC, referenceDate, latitude);
	const cumulativeSinceJan1 =
		dailySeries.length > 0 ? dailySeries[dailySeries.length - 1].cumulativeGdd : 0;
	const last7dSum = computeGddLast7dSum(dailySeries, referenceDate);

	const evergreen = trimmedSpecies ? isEvergreenSpecies(trimmedSpecies) : false;
	const phenology = evergreen
		? null
		: estimatePhenology(cumulativeSinceJan1, category, trimmedSpecies || null);
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
	stageId: GddPhenologyStageId
): number {
	const stages = computeSequentialStageProbabilities(gdd, category);
	return stages.find((stage) => stage.id === stageId)?.probabilityPct ?? 0;
}
