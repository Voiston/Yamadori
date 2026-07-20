import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tree } from '$lib/types/tree';
import { DEFAULT_ASSESSMENT } from '$lib/types/tree';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { fetchTreeEnrichment, toTreeEnrichmentPatch } from './treeEnrichment';

vi.mock('$lib/utils/climate', () => ({
	fetchClimateHistory: vi.fn()
}));

vi.mock('$lib/utils/geocoding', () => ({
	reverseGeocode: vi.fn()
}));

vi.mock('$lib/geo/providers/cadastre/dispatch', () => ({
	lookupCadastreForCoords: vi.fn()
}));

import { fetchClimateHistory } from '$lib/utils/climate';
import { reverseGeocode } from '$lib/utils/geocoding';
import { lookupCadastreForCoords } from '$lib/geo/providers/cadastre/dispatch';

const baseTree: Tree = {
	id: 'tree-1',
	species: 'Maple',
	notes: '',
	photos: [],
	photoThumbs: [],
	visits: [],
	latitude: 47.269,
	longitude: -1.529,
	altitudeMeters: null,
	accuracyMeters: 5,
	frontHeadingDegrees: null,
	capturedAt: '2026-01-01T12:00:00.000Z',
	isFavorite: false,
	climateHistory: null,
	locationLabel: null,
	cadastreInfo: null,
	harvestEthicsConfirmation: null,
	environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
	assessment: { ...DEFAULT_ASSESSMENT },
	voiceNote: null,
	yrsAtCapture: null
};

describe('fetchTreeEnrichment', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty object when tree has no coordinates', async () => {
		const result = await fetchTreeEnrichment({ ...baseTree, latitude: null, longitude: null });
		expect(result).toEqual({});
		expect(fetchClimateHistory).not.toHaveBeenCalled();
	});

	it('skips climate fetch when scope is location', async () => {
		vi.mocked(reverseGeocode).mockResolvedValue('Nantes, Loire-Atlantique');
		vi.mocked(lookupCadastreForCoords).mockResolvedValue(null);

		const result = await fetchTreeEnrichment(baseTree, { scope: 'location' });

		expect(fetchClimateHistory).not.toHaveBeenCalled();
		expect(reverseGeocode).toHaveBeenCalledWith(47.269, -1.529, { signal: undefined });
		expect(result.locationLabel).toBe('Nantes, Loire-Atlantique');
	});

	it('skips location fetches when scope is climate', async () => {
		vi.mocked(fetchClimateHistory).mockResolvedValue({
			years: [],
			source: 'test'
		} as never);

		const result = await fetchTreeEnrichment(baseTree, { scope: 'climate' });

		expect(reverseGeocode).not.toHaveBeenCalled();
		expect(lookupCadastreForCoords).not.toHaveBeenCalled();
		expect(result.climateHistory).toEqual({ years: [], source: 'test' });
	});

	it('merges parallel enrichment results for scope all', async () => {
		vi.mocked(fetchClimateHistory).mockResolvedValue({
			years: [{ year: 2024, frostDays: 1, precipitationMm: 2 }],
			source: 'test'
		} as never);
		vi.mocked(reverseGeocode).mockResolvedValue('Testville');
		vi.mocked(lookupCadastreForCoords).mockResolvedValue({
			commune: 'Testville',
			section: 'AB',
			parcelNumber: '12',
			codeInsee: '44109',
			zoneType: 'private',
			fetchedAt: '2026-01-01T00:00:00.000Z'
		});

		const result = await fetchTreeEnrichment(baseTree);

		expect(result).toMatchObject({
			climateHistory: { source: 'test' },
			locationLabel: 'Testville',
			cadastreInfo: { section: 'AB' }
		});
	});

	it('skips fields already present on the tree', async () => {
		const enrichedTree: Tree = {
			...baseTree,
			climateHistory: { years: [], source: 'cached' } as never,
			locationLabel: 'Cached label',
			cadastreInfo: {
				commune: 'Cached',
				section: 'A',
				parcelNumber: '1',
				codeInsee: '00000',
				zoneType: 'private',
				fetchedAt: '2026-01-01T00:00:00.000Z'
			}
		};

		const result = await fetchTreeEnrichment(enrichedTree);

		expect(result).toEqual({});
		expect(fetchClimateHistory).not.toHaveBeenCalled();
		expect(reverseGeocode).not.toHaveBeenCalled();
		expect(lookupCadastreForCoords).not.toHaveBeenCalled();
	});

	it('propagates abort before starting fetches', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			fetchTreeEnrichment(baseTree, { signal: controller.signal })
		).rejects.toMatchObject({ name: 'AbortError' });
		expect(fetchClimateHistory).not.toHaveBeenCalled();
	});

	it('aborts in-flight climate fetch when signal is triggered', async () => {
		const controller = new AbortController();
		vi.mocked(fetchClimateHistory).mockImplementation((_lat, _lon, options) => {
			return new Promise((_resolve, reject) => {
				options?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('The operation was aborted', 'AbortError')),
					{ once: true }
				);
			});
		});

		const pending = fetchTreeEnrichment(baseTree, {
			signal: controller.signal,
			scope: 'climate'
		});
		controller.abort();

		await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
	});
});

describe('toTreeEnrichmentPatch', () => {
	it('omits climate errors from persist patch', () => {
		const patch = toTreeEnrichmentPatch({
			climateError: 'timeout',
			locationLabel: 'Test'
		});

		expect(patch).toEqual({ locationLabel: 'Test' });
	});
});
