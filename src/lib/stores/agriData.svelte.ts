import type { AgriData, AgriRiskLevel, YamadoriRiskAssessment } from '$lib/types/agri';
import type { YrsPlantInputs } from '$lib/types/yrs';
import { enrichAgriData } from '$lib/utils/agriCache';
import {
	buildAgriDisplayKey,
	buildAgriFetchKey,
	resolveAgriLoadAction
} from '$lib/utils/agriDataPolicy';
import { assessYamadoriRiskDetails } from '$lib/utils/agri';
import { resolveAgriData, type AgriDataSource } from '$lib/utils/agriDataLoader';
import { onlineState } from '$lib/utils/online.svelte';
import { findCachedForecast, isCacheEntryFresh } from '$lib/utils/weatherCache';

export type { AgriDataSource };

export const agriData = $state({
	loading: false,
	error: '',
	data: null as AgriData | null,
	latitude: null as number | null,
	longitude: null as number | null,
	source: null as AgriDataSource,
	cachedAt: null as string | null,
	cacheDistanceM: null as number | null,
	cacheStale: false
});

/** @deprecated Use agriData instead. */
export const agriState = agriData;

export function getAgriRiskLevel(): AgriRiskLevel | null {
	return getAgriRiskDetails()?.level ?? null;
}

export function getAgriRiskDetails(): YamadoriRiskAssessment | null {
	if (!agriData.data) return null;
	return assessYamadoriRiskDetails(agriData.data);
}

let fetchInFlight = false;
let lastFetchKey = '';
let lastDisplayKey = '';

function syncSessionKeysFromState(
	latitude: number,
	longitude: number,
	plantInputs: YrsPlantInputs
): void {
	if (!agriData.data || agriData.source === null) return;
	if (
		buildAgriFetchKey(agriData.latitude ?? latitude, agriData.longitude ?? longitude, plantInputs) !==
		buildAgriFetchKey(latitude, longitude, plantInputs)
	) {
		return;
	}
	if (!lastFetchKey) {
		lastFetchKey = buildAgriFetchKey(latitude, longitude, plantInputs);
	}
	if (!lastDisplayKey) {
		lastDisplayKey = buildAgriDisplayKey(latitude, longitude, plantInputs);
	}
}

function applyLoadResult(
	latitude: number,
	longitude: number,
	plantInputs: YrsPlantInputs,
	result: {
		data: AgriData | null;
		source: AgriDataSource;
		cachedAt: string | null;
		cacheDistanceM: number | null;
		cacheStale: boolean;
		error: string;
	}
): void {
	agriData.data = result.data;
	agriData.source = result.source;
	agriData.cachedAt = result.cachedAt;
	agriData.cacheDistanceM = result.cacheDistanceM;
	agriData.cacheStale = result.cacheStale;
	agriData.error = result.error;
	agriData.latitude = latitude;
	agriData.longitude = longitude;
	if (result.data) {
		lastFetchKey = buildAgriFetchKey(latitude, longitude, plantInputs);
		lastDisplayKey = buildAgriDisplayKey(latitude, longitude, plantInputs);
	}
}

export async function loadAgriData(
	latitude: number,
	longitude: number,
	force = false,
	plantInputs: YrsPlantInputs = {}
): Promise<void> {
	const nextFetchKey = buildAgriFetchKey(latitude, longitude, plantInputs);
	const nextDisplayKey = buildAgriDisplayKey(latitude, longitude, plantInputs);

	syncSessionKeysFromState(latitude, longitude, plantInputs);

	if (fetchInFlight && !force && nextDisplayKey === lastDisplayKey) return;

	const action = resolveAgriLoadAction({
		force,
		online: onlineState.online,
		hasData: agriData.data !== null,
		source: agriData.source,
		currentFetchKey: lastFetchKey,
		currentDisplayKey: lastDisplayKey,
		nextFetchKey,
		nextDisplayKey
	});

	if (action === 'skip') {
		if (onlineState.online && !force) {
			const cached = await findCachedForecast(latitude, longitude);
			if (
				cached?.exactMatch &&
				isCacheEntryFresh(cached.entry.fetchedAt) &&
				(!agriData.cachedAt || !isCacheEntryFresh(agriData.cachedAt))
			) {
				applyLoadResult(latitude, longitude, plantInputs, {
					data: enrichAgriData(cached.entry.data, plantInputs, cached.entry.forecastBody),
					source: 'cache',
					cachedAt: cached.entry.fetchedAt,
					cacheDistanceM: cached.distanceM,
					cacheStale: false,
					error: ''
				});
				return;
			}
		}

		agriData.latitude = latitude;
		agriData.longitude = longitude;
		return;
	}

	if (action === 'recompute') {
		const cached = await findCachedForecast(latitude, longitude);
		if (cached?.exactMatch) {
			agriData.data = enrichAgriData(
				cached.entry.data,
				plantInputs,
				cached.entry.forecastBody
			);
			agriData.latitude = latitude;
			agriData.longitude = longitude;
			agriData.error = '';
			lastDisplayKey = nextDisplayKey;
			return;
		}
	}

	if (!force) {
		const cached = await findCachedForecast(latitude, longitude);
		if (cached?.exactMatch && isCacheEntryFresh(cached.entry.fetchedAt)) {
			applyLoadResult(latitude, longitude, plantInputs, {
				data: enrichAgriData(cached.entry.data, plantInputs, cached.entry.forecastBody),
				source: 'cache',
				cachedAt: cached.entry.fetchedAt,
				cacheDistanceM: cached.distanceM,
				cacheStale: false,
				error: ''
			});
			return;
		}
	}

	fetchInFlight = true;
	agriData.loading = true;
	agriData.error = '';
	agriData.latitude = latitude;
	agriData.longitude = longitude;

	try {
		const result = await resolveAgriData(latitude, longitude, plantInputs, onlineState.online);
		applyLoadResult(latitude, longitude, plantInputs, result);
	} finally {
		agriData.loading = false;
		fetchInFlight = false;
	}
}

export function resetAgriData(): void {
	agriData.loading = false;
	agriData.error = '';
	agriData.data = null;
	agriData.latitude = null;
	agriData.longitude = null;
	agriData.source = null;
	agriData.cachedAt = null;
	agriData.cacheDistanceM = null;
	agriData.cacheStale = false;
	lastFetchKey = '';
	lastDisplayKey = '';
}
