import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClimateHistory } from '$lib/types/climate';

const memoryStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
	createStore: () => ({}),
	get: vi.fn(async (key: string) => memoryStore.get(String(key))),
	set: vi.fn(async (key: string, value: unknown) => {
		memoryStore.set(String(key), value);
	}),
	del: vi.fn(async (key: string) => {
		memoryStore.delete(String(key));
	}),
	keys: vi.fn(async () => [...memoryStore.keys()])
}));

import {
	clearClimateCache,
	getCachedClimateHistory,
	saveCachedClimateHistory
} from './climateCache';

function sampleHistory(): ClimateHistory {
	return {
		fetchedAt: new Date().toISOString(),
		startDate: '2023-01-01',
		endDate: '2026-06-01',
		latitude: 48.1,
		longitude: 2.3,
		absoluteMinTempC: -5,
		yearlyStats: [],
		avgAnnualPrecipitationMm: 600,
		avgFrostDaysPerYear: 12
	};
}

describe('climateCache', () => {
	beforeEach(async () => {
		memoryStore.clear();
		await clearClimateCache();
	});

	it('stores and retrieves climate history by grid key', async () => {
		const history = sampleHistory();
		await saveCachedClimateHistory(48.12, 2.34, history);

		const cached = await getCachedClimateHistory(48.119, 2.339);
		expect(cached?.avgAnnualPrecipitationMm).toBe(600);
	});
});
