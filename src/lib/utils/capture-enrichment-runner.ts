import type { EnvironmentExposure } from '$lib/types/environment';
import type { CadastreInfo } from '$lib/types/cadastre';
import type { ClimateHistory } from '$lib/types/climate';
import { loadAgriData } from '$lib/stores/agriData.svelte';
import { fetchClimateHistory } from '$lib/utils/climate';
import { reverseGeocode } from '$lib/utils/geocoding';
import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';
import { isPoorAccuracy } from '$lib/utils/gps';
import { capturePositionKey } from '$lib/utils/capture-enrichment';

export type CaptureEnrichmentPosition = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
};

export type CaptureEnrichmentClimateState = {
	history: ClimateHistory | null;
	loading: boolean;
	error: string;
	anchor: { latitude: number; longitude: number } | null;
	autoFetchKey: string;
	locked: boolean;
	fetchedApproximate: boolean;
	fetchInFlight: boolean;
};

export type CaptureEnrichmentLocationState = {
	label: string | null;
	loading: boolean;
	anchor: { latitude: number; longitude: number } | null;
	fetchKey: string;
	cadastreInfo: CadastreInfo | null;
	cadastreLoading: boolean;
	cadastreFetchKey: string;
};

export type CaptureEnrichmentAgriState = {
	fetchAnchor: { latitude: number; longitude: number } | null;
	lastInputsKey: string;
};

export type CaptureEnrichmentRunInput = {
	position: CaptureEnrichmentPosition;
	simpleMode: boolean;
	online: boolean;
	species: string;
	environmentExposure: EnvironmentExposure;
	signal: AbortSignal;
	shouldRefetchClimate: (position: CaptureEnrichmentPosition) => boolean;
	shouldRefetchLocation: (position: CaptureEnrichmentPosition) => boolean;
	shouldRefetchAgri: (position: CaptureEnrichmentPosition) => boolean;
	needsCadastreRetry: (position: CaptureEnrichmentPosition) => boolean;
	climate: CaptureEnrichmentClimateState;
	location: CaptureEnrichmentLocationState;
	agri: CaptureEnrichmentAgriState;
};

export type CaptureEnrichmentRunResult = {
	climate: Partial<CaptureEnrichmentClimateState>;
	location: Partial<CaptureEnrichmentLocationState>;
	agri: Partial<CaptureEnrichmentAgriState>;
	clearClimate: boolean;
	clearLocation: boolean;
};

function positionKey(latitude: number, longitude: number): string {
	return capturePositionKey(latitude, longitude);
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}
}

export function createCaptureEnrichmentSession(): {
	run: (input: CaptureEnrichmentRunInput) => Promise<CaptureEnrichmentRunResult>;
	cancel: () => void;
} {
	let activeController: AbortController | null = null;

	return {
		cancel() {
			activeController?.abort();
			activeController = null;
		},
		async run(input) {
			activeController?.abort();
			const controller = new AbortController();
			activeController = controller;

			const linkedSignal = input.signal;
			const onLinkedAbort = () => controller.abort();
			linkedSignal.addEventListener('abort', onLinkedAbort, { once: true });

			try {
				return await runCaptureEnrichmentWave(input, controller.signal);
			} finally {
				linkedSignal.removeEventListener('abort', onLinkedAbort);
				if (activeController === controller) {
					activeController = null;
				}
			}
		}
	};
}

export async function runCaptureEnrichmentWave(
	input: CaptureEnrichmentRunInput,
	signal: AbortSignal
): Promise<CaptureEnrichmentRunResult> {
	const { position, simpleMode } = input;
	const result: CaptureEnrichmentRunResult = {
		climate: {},
		location: {},
		agri: {},
		clearClimate: false,
		clearLocation: false
	};

	if (!position) {
		result.clearClimate = true;
		result.clearLocation = true;
		return result;
	}

	if (signal.aborted) {
		return result;
	}

	const poorAccuracy = isPoorAccuracy(position.accuracyMeters);

	if (poorAccuracy) {
		const hasLocationData =
			input.location.label !== null ||
			input.location.cadastreInfo !== null ||
			input.location.loading ||
			input.location.cadastreLoading ||
			input.location.anchor !== null;
		if (hasLocationData) {
			result.clearLocation = true;
		}
	} else {
		const locationTasks: Promise<void>[] = [];

		if (input.shouldRefetchLocation(position)) {
			locationTasks.push(
				loadLocationWave(position, input.location, signal, result)
			);
		}

		const needsCadastre =
			input.shouldRefetchLocation(position) || input.needsCadastreRetry(position);
		if (needsCadastre) {
			locationTasks.push(
				loadCadastreWave(position, input.location, signal, result, input.needsCadastreRetry(position))
			);
		}

		await Promise.allSettled(locationTasks);
	}

	if (signal.aborted) {
		return result;
	}

	if (!simpleMode) {
		const tasks: Promise<void>[] = [];
		const inputsKey = `${input.species}|${input.environmentExposure}`;
		const movedEnough = input.shouldRefetchAgri(position);

		if (movedEnough || inputsKey !== input.agri.lastInputsKey) {
			result.agri.lastInputsKey = inputsKey;
			if (movedEnough) {
				result.agri.fetchAnchor = {
					latitude: position.latitude,
					longitude: position.longitude
				};
			}
			tasks.push(
				loadAgriData(position.latitude, position.longitude, false, {
					species: input.species,
					environmentExposure: input.environmentExposure
				}).then(() => undefined)
			);
		}

		if (input.shouldRefetchClimate(position)) {
			tasks.push(loadClimateWave(position, input.climate, signal, result));
		}

		await Promise.allSettled(tasks);
	}

	return result;
}

async function loadClimateWave(
	position: CaptureEnrichmentPosition,
	climate: CaptureEnrichmentClimateState,
	signal: AbortSignal,
	result: CaptureEnrichmentRunResult
): Promise<void> {
	const key = positionKey(position.latitude, position.longitude);

	if (!climate.locked || !climate.history) {
		if (climate.fetchInFlight) {
			return;
		}
		if (climate.autoFetchKey === key && (climate.loading || climate.history)) {
			return;
		}

		result.climate.autoFetchKey = key;
		result.climate.loading = true;
		result.climate.error = '';
		result.climate.fetchInFlight = true;

		try {
			throwIfAborted(signal);
			const history = await fetchClimateHistory(position.latitude, position.longitude, {
				signal
			});
			throwIfAborted(signal);
			result.climate.history = history;
			result.climate.anchor = { latitude: position.latitude, longitude: position.longitude };
			result.climate.fetchedApproximate = isPoorAccuracy(position.accuracyMeters);
			result.climate.locked = !result.climate.fetchedApproximate;
		} catch (err) {
			if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
				return;
			}
			result.climate.history = null;
			result.climate.error = err instanceof Error ? err.message : 'climate';
		} finally {
			result.climate.loading = false;
			result.climate.fetchInFlight = false;
		}
	}
}

async function loadLocationWave(
	position: CaptureEnrichmentPosition,
	location: CaptureEnrichmentLocationState,
	signal: AbortSignal,
	result: CaptureEnrichmentRunResult
): Promise<void> {
	const key = positionKey(position.latitude, position.longitude);
	if (location.fetchKey === key && (location.loading || location.label !== null)) {
		return;
	}

	result.location.fetchKey = key;
	result.location.loading = true;

	try {
		throwIfAborted(signal);
		const label = await reverseGeocode(position.latitude, position.longitude, { signal });
		throwIfAborted(signal);
		result.location.label = label;
		result.location.anchor = { latitude: position.latitude, longitude: position.longitude };
	} catch (err) {
		if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
			return;
		}
		result.location.label = null;
		result.location.anchor = { latitude: position.latitude, longitude: position.longitude };
	} finally {
		result.location.loading = false;
	}
}

async function loadCadastreWave(
	position: CaptureEnrichmentPosition,
	location: CaptureEnrichmentLocationState,
	signal: AbortSignal,
	result: CaptureEnrichmentRunResult,
	force: boolean
): Promise<void> {
	const key = positionKey(position.latitude, position.longitude);
	if (!force && location.cadastreFetchKey === key && (location.cadastreLoading || location.cadastreInfo !== null)) {
		return;
	}

	result.location.cadastreFetchKey = key;
	result.location.cadastreLoading = true;

	try {
		throwIfAborted(signal);
		result.location.cadastreInfo = await lookupCadastreForCoords(position.latitude, position.longitude, {
			signal
		});
	} catch (err) {
		if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
			return;
		}
		result.location.cadastreInfo = null;
	} finally {
		result.location.cadastreLoading = false;
	}
}
