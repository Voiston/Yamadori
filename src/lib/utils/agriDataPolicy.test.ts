import { describe, expect, it } from 'vitest';
import { buildAgriDisplayKey, resolveAgriLoadAction } from './agriDataPolicy';

describe('resolveAgriLoadAction', () => {
	const base = {
		hasData: true,
		source: 'live' as const,
		currentFetchKey: '47.20_2.20|Erable',
		currentDisplayKey: '47.20_2.20|Erable|{"observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}',
		nextFetchKey: '47.20_2.20|Erable',
		nextDisplayKey: '47.20_2.20|Erable|{"observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
	};

	it('skips when live data is already loaded for the same context', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				force: false,
				online: true
			})
		).toBe('skip');
	});

	it('recomputes YRS when only assessment inputs change', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				force: false,
				online: true,
				nextDisplayKey:
					'47.20_2.20|Erable|{"observedPhenologyStage":"leaf_out","cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('recompute');
	});

	it('fetches again when species changes', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				force: false,
				online: true,
				nextFetchKey: '47.20_2.20|Pin',
				nextDisplayKey: '47.20_2.20|Pin|{"observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('fetch');
	});

	it('forces a network fetch when requested explicitly', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				force: true,
				online: true
			})
		).toBe('fetch');
	});

	it('reuses cached data offline without refetching', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				source: 'cache',
				force: false,
				online: false
			})
		).toBe('skip');
	});

	it('skips cached data online when the location and species are unchanged', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				source: 'cache',
				force: false,
				online: true
			})
		).toBe('skip');
	});

	it('fetches when only cache exists for a new location', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				source: 'cache',
				force: false,
				online: true,
				nextFetchKey: '47.30_2.30|Erable',
				nextDisplayKey: '47.30_2.30|Erable|{"observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('fetch');
	});
});

describe('buildAgriDisplayKey', () => {
	it('includes environment exposure in the display key', () => {
		const openKey = buildAgriDisplayKey(47.2, 2.2, { species: 'Erable', environmentExposure: 'OPEN' });
		const edgeKey = buildAgriDisplayKey(47.2, 2.2, { species: 'Erable', environmentExposure: 'EDGE' });
		expect(openKey).not.toBe(edgeKey);
	});
});
