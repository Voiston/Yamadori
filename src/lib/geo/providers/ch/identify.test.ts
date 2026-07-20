import { afterEach, describe, expect, it, vi } from 'vitest';
import { identifyGeoAdminLayers } from './identify';
import { cantonHintsFromIdentify } from '$lib/geo/providers/protected/ch';

describe('identifyGeoAdminLayers', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('batches multiple BOD layers into one request', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				results: [
					{
						layerBodId: 'ch.bafu.waldreservate',
						attributes: { label: 'Reserve A' }
					},
					{
						layerBodId: 'ch.swisstopo-vd.geometa-gemeinde',
						attributes: { kanton: 'ZH', gemeindename: 'Zürich' }
					}
				]
			})
		});
		vi.stubGlobal('fetch', fetchMock);

		const results = await identifyGeoAdminLayers(
			['ch.bafu.waldreservate', 'ch.swisstopo-vd.geometa-gemeinde'],
			47.37,
			8.54,
			{ signal: new AbortController().signal }
		);

		expect(fetchMock).toHaveBeenCalledOnce();
		const url = String(fetchMock.mock.calls[0]?.[0]);
		expect(url).toContain('layers=all%3Ach.bafu.waldreservate%2Cch.swisstopo-vd.geometa-gemeinde');
		expect(results).toHaveLength(2);
	});
});

describe('cantonHintsFromIdentify', () => {
	it('extracts kanton / ak tokens for resolveSwissCanton', () => {
		const hints = cantonHintsFromIdentify([
			{ layerBodId: 'ch.swisstopo-vd.geometa-gemeinde', attributes: { kanton: 'ZH' } },
			{ layerBodId: 'ch.swisstopo-vd.amtliche-vermessung', attributes: { ak: 'CH-BE' } }
		]);
		expect(hints).toEqual(expect.arrayContaining(['ZH', 'CH-BE']));
	});
});
