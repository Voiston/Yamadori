import { afterEach, describe, expect, it, vi } from 'vitest';

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
	aggregateClimateData,
	fetchClimateHistory,
	getClimateDateRange,
	parseOpenMeteoErrorResponse
} from './climate';

describe('getClimateDateRange', () => {
	it('ends 5 days before the reference date (ERA5 archive lag)', () => {
		const range = getClimateDateRange(new Date('2026-06-22T12:00:00Z'));
		expect(range.endDate).toBe('2026-06-17');
		expect(range.startDate).toBe('2023-06-17');
	});
});

describe('aggregateClimateData', () => {
	it('aggregates yearly frost days and precipitation', () => {
		const range = { startDate: '2023-01-01', endDate: '2023-12-31' };
		const result = aggregateClimateData(
			['2023-01-01', '2023-01-02', '2023-06-01'],
			[-2, 3, -1],
			[1.2, 0, 5],
			47.26,
			-1.52,
			range
		);

		expect(result.absoluteMinTempC).toBe(-2);
		expect(result.yearlyStats).toHaveLength(1);
		expect(result.yearlyStats[0]).toEqual({
			year: 2023,
			precipitationMm: 6,
			frostDays: 2
		});
		expect(result.avgAnnualPrecipitationMm).toBe(6);
		expect(result.avgFrostDaysPerYear).toBe(2);
	});
});

describe('parseOpenMeteoErrorResponse', () => {
	it('includes API reason and status code', async () => {
		const response = new Response(
			JSON.stringify({ error: true, reason: 'End date is after last available date' }),
			{ status: 400 }
		);
		const message = await parseOpenMeteoErrorResponse(response);
		expect(message).toBe('Open-Meteo (400) : End date is after last available date');
	});
});

describe('fetchClimateHistory', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('throws parsed Open-Meteo error on HTTP 400', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({ error: true, reason: 'End date is after last available date' }),
					{ status: 400 }
				)
			)
		);

		await expect(fetchClimateHistory(47.26, -1.52)).rejects.toThrow(
			'Open-Meteo (400) : End date is after last available date'
		);
	});
});
