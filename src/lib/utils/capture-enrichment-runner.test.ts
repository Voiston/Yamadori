import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaptureEnrichmentSession } from './capture-enrichment-runner';

vi.mock('$lib/stores/agriData.svelte', () => ({
	loadAgriData: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/utils/climate', () => ({
	fetchClimateHistory: vi.fn().mockResolvedValue({ months: [] })
}));

vi.mock('$lib/utils/geocoding', () => ({
	reverseGeocode: vi.fn().mockResolvedValue('Test Forest')
}));

vi.mock('$lib/geo/providers/cadastre/dispatch', () => ({
	lookupCadastreForCoords: vi.fn().mockResolvedValue({ parcelle: 'AB123' })
}));

import { loadAgriData } from '$lib/stores/agriData.svelte';
import { fetchClimateHistory } from '$lib/utils/climate';
import { reverseGeocode } from '$lib/utils/geocoding';
import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';

const basePosition = {
	latitude: 45.1,
	longitude: 5.2,
	accuracyMeters: 8
};

const baseInput = {
	position: basePosition,
	simpleMode: false,
	online: true,
	species: 'pin',
	environmentExposure: 'OPEN' as const,
	signal: new AbortController().signal,
	shouldRefetchClimate: () => true,
	shouldRefetchLocation: () => true,
	shouldRefetchAgri: () => true,
	needsCadastreRetry: () => false,
	climate: {
		history: null,
		loading: false,
		error: '',
		anchor: null,
		autoFetchKey: '',
		locked: false,
		fetchedApproximate: false,
		fetchInFlight: false
	},
	location: {
		label: null,
		loading: false,
		anchor: null,
		fetchKey: '',
		cadastreInfo: null,
		cadastreLoading: false,
		cadastreFetchKey: ''
	},
	agri: {
		fetchAnchor: null,
		lastInputsKey: ''
	}
};

describe('createCaptureEnrichmentSession', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('runs climate, location, cadastre and agri in one wave', async () => {
		const session = createCaptureEnrichmentSession();
		const result = await session.run(baseInput);

		expect(loadAgriData).toHaveBeenCalledOnce();
		expect(fetchClimateHistory).toHaveBeenCalledOnce();
		expect(reverseGeocode).toHaveBeenCalledOnce();
		expect(lookupCadastreForCoords).toHaveBeenCalledOnce();
		expect(result.location.label).toBe('Test Forest');
		expect(result.climate.history).toEqual({ months: [] });
	});

	it('skips climate archive when shouldRefetchClimate is false', async () => {
		const session = createCaptureEnrichmentSession();
		await session.run({
			...baseInput,
			shouldRefetchClimate: () => false
		});

		expect(fetchClimateHistory).not.toHaveBeenCalled();
		expect(loadAgriData).toHaveBeenCalledOnce();
	});

	it('cancels an in-flight wave without throwing', async () => {
		const session = createCaptureEnrichmentSession();
		let abortSeen = false;

		vi.mocked(fetchClimateHistory).mockImplementation(
			(_latitude, _longitude, options) =>
				new Promise((_, reject) => {
					options?.signal?.addEventListener('abort', () => {
						abortSeen = true;
						reject(new DOMException('Aborted', 'AbortError'));
					});
				})
		);

		const pending = session.run(baseInput);
		await new Promise((resolve) => setTimeout(resolve, 0));
		session.cancel();
		await expect(pending).resolves.toEqual(expect.objectContaining({ climate: expect.any(Object) }));
		expect(abortSeen).toBe(true);
	});
});
