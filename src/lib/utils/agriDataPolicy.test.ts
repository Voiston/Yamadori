import { describe, expect, it } from 'vitest';
import {
	buildAgriDisplayKey,
	buildAgriFetchKey,
	resolveAgriLoadAction
} from './agriDataPolicy';

describe('resolveAgriLoadAction', () => {
	const base = {
		hasData: true,
		source: 'live' as const,
		currentFetchKey: '47.20_2.20',
		currentDisplayKey:
			'47.20_2.20|{"species":"Erable","observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}',
		nextFetchKey: '47.20_2.20',
		nextDisplayKey:
			'47.20_2.20|{"species":"Erable","observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
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
					'47.20_2.20|{"species":"Erable","observedPhenologyStage":"leaf_out","cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('recompute');
	});

	it('recomputes YRS when species changes without a new forecast fetch', () => {
		expect(
			resolveAgriLoadAction({
				...base,
				force: false,
				online: true,
				nextFetchKey: '47.20_2.20',
				nextDisplayKey:
					'47.20_2.20|{"species":"Pin","observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('recompute');
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

	it('skips cached data online when the location is unchanged', () => {
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
				nextFetchKey: '47.30_2.30',
				nextDisplayKey:
					'47.30_2.30|{"species":"Erable","observedPhenologyStage":null,"cernageStatus":null,"environmentExposure":"OPEN"}'
			})
		).toBe('fetch');
	});
});

describe('buildAgriFetchKey', () => {
	it('depends only on the coordinate grid', () => {
		expect(buildAgriFetchKey(47.261, 2.201)).toBe(buildAgriFetchKey(47.264, 2.204));
	});
});

describe('buildAgriDisplayKey', () => {
	it('includes species and environment exposure in the display key', () => {
		const openKey = buildAgriDisplayKey(47.2, 2.2, {
			species: 'Erable',
			environmentExposure: 'OPEN'
		});
		const edgeKey = buildAgriDisplayKey(47.2, 2.2, {
			species: 'Erable',
			environmentExposure: 'EDGE'
		});
		const pineKey = buildAgriDisplayKey(47.2, 2.2, {
			species: 'Pin',
			environmentExposure: 'OPEN'
		});
		expect(openKey).not.toBe(edgeKey);
		expect(openKey).not.toBe(pineKey);
	});
});
