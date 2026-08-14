import type { CadastreInfo } from '$lib/types/cadastre';
import type { ClimateHistory } from '$lib/types/climate';
import type { Tree } from '$lib/types/tree';
import { isAbortError, throwIfAborted } from '$lib/utils/abortSignal';
import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';
import { fetchClimateHistory } from '$lib/utils/climate';
import { isPoorAccuracy } from '$lib/utils/gps';
import { reverseGeocode } from '$lib/utils/geocoding';

export type TreeEnrichmentResult = {
	climateHistory?: ClimateHistory;
	climateError?: string;
	locationLabel?: string;
	cadastreInfo?: CadastreInfo | null;
};

export type TreeEnrichmentScope = 'all' | 'location' | 'climate';

export type TreeEnrichmentOptions = {
	signal?: AbortSignal;
	scope?: TreeEnrichmentScope;
};

function buildEnrichmentPatch(result: TreeEnrichmentResult): TreeEnrichmentResult {
	return {
		...(result.climateHistory !== undefined ? { climateHistory: result.climateHistory } : {}),
		...(result.climateError !== undefined ? { climateError: result.climateError } : {}),
		...(result.locationLabel !== undefined ? { locationLabel: result.locationLabel } : {}),
		...(result.cadastreInfo !== undefined ? { cadastreInfo: result.cadastreInfo } : {})
	};
}

/** Fetch missing climate, geocode label and/or cadastre in parallel for one tree. */
export async function fetchTreeEnrichment(
	tree: Tree,
	options?: TreeEnrichmentOptions
): Promise<TreeEnrichmentResult> {
	throwIfAborted(options?.signal);

	if (tree.latitude === null || tree.longitude === null) {
		return {};
	}

	const scope = options?.scope ?? 'all';
	const signal = options?.signal;
	const { latitude, longitude } = tree;
	const needsClimate = scope !== 'location' && !tree.climateHistory;
	const needsLabel = scope !== 'climate' && !tree.locationLabel;
	const needsCadastre =
		scope !== 'climate' && !tree.cadastreInfo && !isPoorAccuracy(tree.accuracyMeters);

	if (!needsClimate && !needsLabel && !needsCadastre) {
		return {};
	}

	const fetchOpts = { signal };

	const [climateResult, labelResult, cadastreResult] = await Promise.all([
			needsClimate
				? fetchClimateHistory(latitude, longitude, fetchOpts)
						.then((climateHistory) => ({ climateHistory }))
						.catch((err: unknown) => {
							if (isAbortError(err)) {
								throw err;
							}
							return {
								climateError: err instanceof Error ? err.message : 'climate_unavailable'
							};
						})
				: Promise.resolve({}),
			needsLabel
				? reverseGeocode(latitude, longitude, fetchOpts)
						.then((locationLabel) => ({ locationLabel }))
						.catch((err: unknown) => {
							if (isAbortError(err)) {
								throw err;
							}
							return {};
						})
				: Promise.resolve({}),
			needsCadastre
				? lookupCadastreForCoords(latitude, longitude, fetchOpts)
						.then((cadastreInfo) => ({ cadastreInfo: cadastreInfo ?? null }))
						.catch((err: unknown) => {
							if (isAbortError(err)) {
								throw err;
							}
							return {};
						})
				: Promise.resolve({})
	]);

	return buildEnrichmentPatch({ ...climateResult, ...labelResult, ...cadastreResult });
}

export function toTreeEnrichmentPatch(
	result: TreeEnrichmentResult
): Pick<TreeEnrichmentResult, 'climateHistory' | 'locationLabel' | 'cadastreInfo'> {
	return {
		...(result.climateHistory !== undefined ? { climateHistory: result.climateHistory } : {}),
		...(result.locationLabel !== undefined ? { locationLabel: result.locationLabel } : {}),
		...(result.cadastreInfo !== undefined ? { cadastreInfo: result.cadastreInfo } : {})
	};
}
