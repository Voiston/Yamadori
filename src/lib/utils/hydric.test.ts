import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import {
	HYDRIC_AWC_MM,
	computeHydricFromAgriInputs,
	computeHydricStressKs,
	computeRadiationStressIndex,
	computeSoilBufferScore,
	computeSoilMoistureCreditMm,
	computeWindStressIndex,
	computeWSI,
	mapKsToWsiCompat
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

describe('computeHydricStressKs', () => {
	it('is 1 when rain and credit cover ET₀ (no depletion)', () => {
		expect(computeHydricStressKs(5.6, 30, 10)).toBe(1);
	});

	it('decreases as depletion approaches AWC', () => {
		const mild = computeHydricStressKs(40, 10, 0)!;
		const severe = computeHydricStressKs(50, 5, 0)!;
		expect(mild).toBeLessThan(1);
		expect(severe).toBeLessThan(mild);
		expect(severe).toBeGreaterThanOrEqual(0);
	});

	it('returns null when ET₀ sum is unavailable', () => {
		expect(computeHydricStressKs(null, 10, 5)).toBeNull();
	});
});

describe('mapKsToWsiCompat', () => {
	it('maps Ks 0.5 to 0 and Ks 1 to 10', () => {
		expect(mapKsToWsiCompat(0.5)).toBe(0);
		expect(mapKsToWsiCompat(1)).toBe(10);
	});
});

describe('computeHydricFromAgriInputs', () => {
	it('produces Ks and compat WSI from agri fields', () => {
		const result = computeHydricFromAgriInputs({
			et0Past7dSumMm: 5.6,
			rainPast7dMm: 30,
			soilMoisture7cmPct: 50,
			soilTemperature18cmC: 11,
			waterBalance7dMm: 24.4
		});
		expect(result.hydricStressKs).toBe(1);
		expect(result.wsi).toBe(mapKsToWsiCompat(1));
		expect(result.soilMoistureCreditMm).toBe((50 / 100) * HYDRIC_AWC_MM);
	});
});

describe('computeSoilMoistureCreditMm', () => {
	it('scales moisture percent to AWC', () => {
		expect(
			computeSoilMoistureCreditMm({
				...baseHydricData,
				soilMoisture7cmPct: 100
			})
		).toBe(HYDRIC_AWC_MM);
	});
});

describe('computeWSI', () => {
	it('maps surplus water balance to high Ks compat scale', () => {
		const wsi = computeWSI(10, 50);
		expect(wsi).not.toBeNull();
		expect(wsi!).toBeGreaterThan(0);
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
