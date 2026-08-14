import type { YrsPlantInputs } from '$lib/types/yrs';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { gridKeyForCoordinates } from '$lib/utils/weatherCache';

export type AgriLoadAction = 'fetch' | 'recompute' | 'skip';

/** Network fetch key — location grid only (Open-Meteo forecast is species-agnostic). */
export function buildAgriFetchKey(latitude: number, longitude: number): string {
	return gridKeyForCoordinates(latitude, longitude);
}

/** Display/recompute key — includes plant inputs that affect YRS enrichment. */
export function buildAgriDisplayKey(
	latitude: number,
	longitude: number,
	inputs: YrsPlantInputs
): string {
	return `${buildAgriFetchKey(latitude, longitude)}|${JSON.stringify({
		species: inputs.species?.trim() ?? '',
		observedPhenologyStage: inputs.observedPhenologyStage ?? null,
		cernageStatus: inputs.cernageStatus ?? null,
		aoutementStatus: inputs.aoutementStatus ?? null,
		leafFallPct: inputs.leafFallPct ?? null,
		environmentExposure: inputs.environmentExposure ?? DEFAULT_ENVIRONMENT_EXPOSURE
	})}`;
}

export function resolveAgriLoadAction(options: {
	force: boolean;
	online: boolean;
	hasData: boolean;
	source: 'live' | 'cache' | null;
	currentFetchKey: string;
	currentDisplayKey: string;
	nextFetchKey: string;
	nextDisplayKey: string;
}): AgriLoadAction {
	const {
		force,
		hasData,
		source,
		currentFetchKey,
		currentDisplayKey,
		nextFetchKey,
		nextDisplayKey
	} = options;

	if (force) return 'fetch';
	if (!hasData) return 'fetch';

	if (currentFetchKey === nextFetchKey && source !== null) {
		return currentDisplayKey === nextDisplayKey ? 'skip' : 'recompute';
	}

	return 'fetch';
}
