import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import { estimatePhenology } from '$lib/utils/gdd';
import { applyEnvironmentExposure, adjustSoilTemperature, scaleGddSnapshot } from './adjustedClimate';

function buildBaseAgriData(): AgriData {
	return {
		fetchedAt: '2026-06-22T12:00:00.000Z',
		latitude: 47.5,
		longitude: -0.5,
		airTemperatureC: 18,
		relativeHumidityPct: 50,
		windSpeedKmh: 30,
		et0TodayMm: 5,
		shortwaveRadiationCurrentWm2: 500,
		shortwaveRadiationMaxTodayWm2: 700,
		soilTemperature6cmC: 14,
		soilTemperature18cmC: 10,
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
		et0Past7dMeanMm: 5,
		et0Trend7dMeanMm: 5,
		et0Past7dSumMm: 35,
		et0Forecast7dSumMm: 35,
		waterBalance7dMm: -5,
		windStressIndex: 70,
		radiationStressIndex: 80,
		heatStressDaysPast7d: 0,
		heatStressDaysForecast7d: 0,
		frostEventsPast7d: 0,
		soilBufferScore: 70,
		wsi: 2,
		futureStressRiskMm: 35,
		weeklyViability: null,
		gdd: {
			baseTempC: 4.5,
			baseCategory: 'foret',
			cumulativeSinceJan1: 200,
			last7dSum: 40,
			dailySeries: [
				{ date: '2026-06-15', meanTempC: 12, dailyGdd: 10, cumulativeGdd: 190 },
				{ date: '2026-06-16', meanTempC: 12, dailyGdd: 10, cumulativeGdd: 200 }
			],
			phenology: estimatePhenology(200, 'foret'),
			phenologyUnavailableReason: null,
			speciesLabel: 'Hêtre commun'
		},
		yrs: null
	};
}

describe('applyEnvironmentExposure', () => {
	it('returns unchanged data for OPEN exposure', () => {
		const base = buildBaseAgriData();
		const { data, gdd } = applyEnvironmentExposure(base, base.gdd, 'OPEN');
		expect(data).toBe(base);
		expect(gdd).toBe(base.gdd);
	});

	it('applies EDGE coefficients to ET0, wind and radiation', () => {
		const base = buildBaseAgriData();
		const { data } = applyEnvironmentExposure(base, base.gdd, 'EDGE');

		expect(data.windSpeedKmh).toBe(15);
		expect(data.et0TodayMm).toBe(3.5);
		expect(data.et0Past7dMeanMm).toBe(3.5);
		expect(data.shortwaveRadiationMaxTodayWm2).toBe(490);
		expect(data.waterBalance7dMm).toBe(5.5);
		expect(data.futureStressRiskMm).toBe(24.5);
		expect(data.windStressIndex).toBeLessThan(base.windStressIndex);
		expect(data.radiationStressIndex).toBeLessThan(base.radiationStressIndex);
	});

	it('applies FOREST_DENSE coefficients aggressively', () => {
		const base = buildBaseAgriData();
		const { data } = applyEnvironmentExposure(base, base.gdd, 'FOREST_DENSE');

		expect(data.windSpeedKmh).toBe(3);
		expect(data.et0TodayMm).toBe(2);
		expect(data.shortwaveRadiationMaxTodayWm2).toBe(210);
	});

	it('modulates GDD without zeroing it', () => {
		const base = buildBaseAgriData();
		const { gdd } = applyEnvironmentExposure(base, base.gdd, 'EDGE');

		expect(gdd?.cumulativeSinceJan1).toBe(170);
		expect(gdd?.dailySeries[1]?.dailyGdd).toBe(8.5);
		expect(gdd?.phenology).not.toBeNull();
	});

	it('only dampens solar soil warming, never warms cold soil toward air', () => {
		// Sol plus froid que l'air : lisière ne doit pas réchauffer
		expect(adjustSoilTemperature(10, 18, 0.8)).toBe(10);
		expect(adjustSoilTemperature(14, 18, 0.8)).toBe(14);

		// Sol réchauffé par le soleil : lisière atténue
		expect(adjustSoilTemperature(22, 18, 0.8)).toBe(21.2);

		const base = buildBaseAgriData();
		const open = applyEnvironmentExposure(base, base.gdd, 'OPEN').data;
		const edge = applyEnvironmentExposure(base, base.gdd, 'EDGE').data;

		expect(edge.soilTemperature6cmC).toBeLessThanOrEqual(open.soilTemperature6cmC);
		expect(edge.soilTemperature18cmC).toBeLessThanOrEqual(open.soilTemperature18cmC);
		expect(edge.soilTemperature6cmC).toBe(14);
		expect(edge.soilTemperature18cmC).toBe(10);
	});
});

describe('scaleGddSnapshot', () => {
	it('returns null for null input', () => {
		expect(scaleGddSnapshot(null, 0.7)).toBeNull();
	});
});
