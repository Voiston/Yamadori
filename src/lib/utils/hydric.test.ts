import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import {
	computeRadiationStressIndex,
	computeSoilBufferScore,
	computeWindStressIndex,
	computeWSI
} from './hydric';

const baseHydricData: Pick<
	AgriData,
	'soilMoisture7cmPct' | 'rainPast7dMm' | 'soilTemperature18cmC'
> = {
	soilMoisture7cmPct: null,
	rainPast7dMm: 20,
	soilTemperature18cmC: 11
};

describe('computeSoilBufferScore', () => {
	it('uses soil moisture when available', () => {
		expect(computeSoilBufferScore({ ...baseHydricData, soilMoisture7cmPct: 42 })).toBe(42);
	});

	it('falls back to rain and soil temperature proxy', () => {
		const score = computeSoilBufferScore(baseHydricData);
		expect(score).toBeGreaterThan(40);
		expect(score).toBeLessThan(90);
	});
});

describe('computeWSI', () => {
	it('adds soil buffer contribution to water balance', () => {
		expect(computeWSI(10, 50)).toBe(15);
	});

	it('returns null when water balance is unavailable', () => {
		expect(computeWSI(null, 50)).toBeNull();
	});
});

describe('computeWindStressIndex', () => {
	it('increases with wind and dryness', () => {
		const low = computeWindStressIndex(10, 70);
		const high = computeWindStressIndex(35, 30);
		expect(high).toBeGreaterThan(low);
	});
});

describe('computeRadiationStressIndex', () => {
	it('increases with radiation and ET0', () => {
		const low = computeRadiationStressIndex(200, 0.5);
		const high = computeRadiationStressIndex(650, 5);
		expect(high).toBeGreaterThan(low);
	});
});
