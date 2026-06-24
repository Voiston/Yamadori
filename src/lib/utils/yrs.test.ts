import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import { estimatePhenology } from '$lib/utils/gdd';
import {
	computeYamadoriReadinessScore,
	determineYrsDecision,
	getYrsBannerClasses,
	getYrsScoreBreakdown
} from './yrs';

function buildIdealAgriData(): AgriData {
	return {
		fetchedAt: '2026-06-22T12:00:00.000Z',
		latitude: 47.5,
		longitude: -0.5,
		airTemperatureC: 18,
		relativeHumidityPct: 65,
		windSpeedKmh: 12,
		et0TodayMm: 0.8,
		shortwaveRadiationCurrentWm2: 300,
		shortwaveRadiationMaxTodayWm2: 350,
		soilTemperature6cmC: 11,
		soilTemperature18cmC: 11,
		rainPast3dMm: 15,
		rainPast5dMm: 25,
		rainPast7dMm: 30,
		soilConsecutiveStableDays: 5,
		soilMean5dC: 11,
		soilMean6cm7dC: 11,
		soilMean18cm7dC: 11,
		soilDailyHistory7d: [],
		soilBrutalNightDrop: false,
		soilTrend7dRising: true,
		soilHeatBufferC: 0,
		soilStabilityScore: 95,
		soilMoisture7cmPct: null,
		frostRiskNext7d: false,
		frostMinNext7dC: 2,
		et0Past7dMeanMm: 0.8,
		et0Trend7dMeanMm: 0.8,
		et0Past7dSumMm: 5.6,
		et0Forecast7dSumMm: 5.6,
		waterBalance7dMm: 24.4,
		windStressIndex: 25,
		radiationStressIndex: 30,
		heatStressDaysPast7d: 0,
		heatStressDaysForecast7d: 0,
		frostEventsPast7d: 0,
		soilBufferScore: 70,
		wsi: 31.4,
		futureStressRiskMm: 5.6,
		weeklyViability: null,
		gdd: {
			baseTempC: 4.5,
			baseCategory: 'foret',
			cumulativeSinceJan1: 220,
			last7dSum: 40,
			dailySeries: [],
			phenology: estimatePhenology(220, 'foret'),
			phenologyUnavailableReason: null,
			speciesLabel: 'Hêtre commun'
		},
		yrs: null
	};
}

describe('determineYrsDecision', () => {
	it('maps score ranges to decisions', () => {
		expect(determineYrsDecision(85)).toBe('OPTIMAL');
		expect(determineYrsDecision(70)).toBe('ACCEPTABLE');
		expect(determineYrsDecision(50)).toBe('RISK');
		expect(determineYrsDecision(20)).toBe('NO_GO');
	});
});

describe('getYrsBannerClasses', () => {
	it('maps decisions to subtle banner border classes', () => {
		expect(getYrsBannerClasses(85)).toContain('emerald');
		expect(getYrsBannerClasses(70)).toContain('amber');
		expect(getYrsBannerClasses(50)).toContain('orange');
		expect(getYrsBannerClasses(20)).toContain('red');
	});
});

describe('computeYamadoriReadinessScore', () => {
	it('returns a high score for ideal layered conditions', () => {
		const result = computeYamadoriReadinessScore(buildIdealAgriData());
		expect(result.score).toBeGreaterThanOrEqual(75);
		expect(result.layers.climate).toBeGreaterThan(0);
		expect(result.layers.soil).toBeGreaterThan(0);
		expect(result.layers.hydric).toBeGreaterThan(0);
	});

	it('uses observed phenology override when provided', () => {
		const withOverride = computeYamadoriReadinessScore(buildIdealAgriData(), {
			observedPhenologyStage: 'debourrement'
		});
		const withoutOverride = computeYamadoriReadinessScore(buildIdealAgriData());
		expect(withOverride.layers.phenology).toBeGreaterThanOrEqual(withoutOverride.layers.phenology);
	});

	it('penalizes cold soil and frost', () => {
		const ideal = computeYamadoriReadinessScore(buildIdealAgriData());
		const result = computeYamadoriReadinessScore({
			...buildIdealAgriData(),
			soilTemperature18cmC: 6,
			frostEventsPast7d: 2,
			frostRiskNext7d: true,
			wsi: -10,
			waterBalance7dMm: -12
		});
		expect(result.score).toBeLessThan(ideal.score - 15);
		expect(result.layers.stressPenalty).toBeGreaterThan(0);
	});

	it('applies microclimate factor from environment exposure', () => {
		const stressed = {
			...buildIdealAgriData(),
			windSpeedKmh: 40,
			windStressIndex: 75,
			radiationStressIndex: 75,
			waterBalance7dMm: -15,
			wsi: -5
		};
		const open = computeYamadoriReadinessScore(stressed, { environmentExposure: 'OPEN' });
		const edge = computeYamadoriReadinessScore(stressed, { environmentExposure: 'EDGE' });
		const forest = computeYamadoriReadinessScore(stressed, {
			environmentExposure: 'FOREST_DENSE'
		});

		expect(open.score).toBeLessThan(100);
		expect(edge.score).toBeGreaterThan(open.score);
		expect(forest.score).toBeGreaterThan(edge.score);
	});
});

describe('getYrsScoreBreakdown', () => {
	it('matches computed layer scores', () => {
		const data = buildIdealAgriData();
		const breakdown = getYrsScoreBreakdown(data);
		const result = computeYamadoriReadinessScore(data);

		expect(breakdown.climate.total).toBe(result.layers.climate);
		expect(breakdown.soil.total).toBe(result.layers.soil);
		expect(breakdown.phenology.total).toBe(result.layers.phenology);
		expect(breakdown.hydric.total).toBe(result.layers.hydric);
		expect(breakdown.stressPenalty.total).toBe(result.layers.stressPenalty);
	});

	it('lists frost penalty contributors', () => {
		const breakdown = getYrsScoreBreakdown({
			...buildIdealAgriData(),
			frostEventsPast7d: 1,
			frostRiskNext7d: true,
			heatStressDaysForecast7d: 2
		});

		expect(breakdown.stressPenalty.total).toBe(20);
		expect(breakdown.stressPenalty.items).toHaveLength(2);
	});

	it('scales night drop stress penalty with seasonal weight', () => {
		const spring = getYrsScoreBreakdown({
			...buildIdealAgriData(),
			soilBrutalNightDrop: true
		});
		const summer = getYrsScoreBreakdown({
			...buildIdealAgriData(),
			soilBrutalNightDrop: true,
			gdd: {
				...buildIdealAgriData().gdd!,
				cumulativeSinceJan1: 620,
				phenology: estimatePhenology(620, 'foret')
			}
		});

		expect(spring.stressPenalty.total).toBeGreaterThan(summer.stressPenalty.total);
		expect(summer.stressPenalty.total).toBe(0);
	});
});
