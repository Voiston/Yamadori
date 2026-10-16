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
		hydricStressKs: 1,
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

	it('recomputes Ks from the scaled ET0 when a water deficit remains', () => {
		const base = {
			...buildBaseAgriData(),
			rainPast7dMm: 0,
			et0Past7dSumMm: 40,
			soilTemperature18cmC: 10,
			airTemperatureC: 18,
			soilMoisture7cmPct: null,
			hydricStressKs: 0.2
		};

		const open = applyEnvironmentExposure(base, base.gdd, 'OPEN');
		expect(open.data).toBe(base);
		expect(open.data.hydricStressKs).toBe(0.2);
		expect(open.data.et0Past7dSumMm).toBe(40);

		const forest = applyEnvironmentExposure(base, base.gdd, 'FOREST_DENSE').data;
		expect(forest.et0Past7dSumMm).toBe(16);
		expect(forest.hydricStressKs).toBe(0.8);
		expect(forest.wsi).toBe(6);
		expect(forest.soilBufferScore).toBe(32);
	});

	it('clears Ks when the ET0 sum is null', () => {
		const base = {
			...buildBaseAgriData(),
			et0Past7dSumMm: null,
			hydricStressKs: 0.2
		};
		const forest = applyEnvironmentExposure(base, base.gdd, 'FOREST_DENSE').data;

		expect(forest.et0Past7dSumMm).toBeNull();
		expect(forest.hydricStressKs).toBeNull();
		expect(forest.waterBalance7dMm).toBeNull();
		expect(forest.wsi).toBeNull();
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

	it('dampens instantaneous forest soil toward colder air without rewriting history', () => {
		expect(adjustSoilTemperature(11, 4, 0.65)).toBe(8.6);
		expect(adjustSoilTemperature(11, 2, 0.65)).toBe(7.9);

		const history = [
			{ date: '2026-06-17', mean6cmC: 11, mean18cmC: 11 },
			{ date: '2026-06-18', mean6cmC: 11, mean18cmC: 11 },
			{ date: '2026-06-19', mean6cmC: 11, mean18cmC: 11 },
			{ date: '2026-06-20', mean6cmC: 11, mean18cmC: 11 },
			{ date: '2026-06-21', mean6cmC: 11, mean18cmC: 11 }
		];
		const base = {
			...buildBaseAgriData(),
			airTemperatureC: 4,
			soilTemperature6cmC: 11,
			soilTemperature18cmC: 11,
			soilMean5dC: 11,
			soilMean6cm7dC: 11,
			soilMean18cm7dC: 11,
			soilDailyHistory7d: history,
			soilConsecutiveStableDays: 5,
			soilTrend7dRising: true
		};

		const forest = applyEnvironmentExposure(base, base.gdd, 'FOREST_DENSE').data;

		expect(forest.soilTemperature6cmC).toBe(8.6);
		expect(forest.soilTemperature18cmC).toBe(8.6);
		expect(forest.soilMean5dC).toBe(11);
		expect(forest.soilMean6cm7dC).toBe(11);
		expect(forest.soilMean18cm7dC).toBe(11);
		expect(forest.soilDailyHistory7d).toEqual(history);
		expect(forest.soilConsecutiveStableDays).toBe(5);
		expect(forest.soilTrend7dRising).toBe(true);
	});

	it('keeps precomputed stable days when shaded exposure leaves history untouched', () => {
		const history = [
			{ date: '2026-06-17', mean6cmC: 17, mean18cmC: 17 },
			{ date: '2026-06-18', mean6cmC: 17, mean18cmC: 17 },
			{ date: '2026-06-19', mean6cmC: 17, mean18cmC: 17 },
			{ date: '2026-06-20', mean6cmC: 17, mean18cmC: 17 },
			{ date: '2026-06-21', mean6cmC: 17, mean18cmC: 17 }
		];
		const base = {
			...buildBaseAgriData(),
			airTemperatureC: 20,
			soilTemperature6cmC: 17,
			soilTemperature18cmC: 16,
			soilDailyHistory7d: history,
			soilConsecutiveStableDays: 4,
			soilTrend7dRising: true
		};

		const open = applyEnvironmentExposure(base, base.gdd, 'OPEN').data;
		const edge = applyEnvironmentExposure(base, base.gdd, 'EDGE').data;

		expect(open.soilDailyHistory7d).toBe(history);
		expect(open.soilConsecutiveStableDays).toBe(4);
		expect(edge.soilDailyHistory7d).toEqual(history);
		expect(edge.soilConsecutiveStableDays).toBe(4);
		expect(edge.soilTrend7dRising).toBe(true);
		expect(edge.soilTemperature6cmC).toBe(17);
	});
});

describe('scaleGddSnapshot', () => {
	it('returns null for null input', () => {
		expect(scaleGddSnapshot(null, 0.7)).toBeNull();
	});

	it('keeps the species phenology curve when GDD is scaled', () => {
		const gdd = {
			baseTempC: 4,
			baseCategory: 'foret' as const,
			cumulativeSinceJan1: 100,
			last7dSum: 20,
			dailySeries: [{ date: '2026-06-16', meanTempC: 12, dailyGdd: 10, cumulativeGdd: 100 }],
			phenology: estimatePhenology(100, 'foret', 'Bouleau'),
			phenologyUnavailableReason: null,
			speciesLabel: 'Bouleau'
		};

		const scaled = scaleGddSnapshot(gdd, 0.7);

		expect(scaled?.cumulativeSinceJan1).toBe(70);
		expect(scaled?.speciesLabel).toBe('Bouleau');
		expect(scaled?.phenology).toEqual(estimatePhenology(70, 'foret', 'Bouleau'));
		expect(scaled?.phenology).not.toEqual(estimatePhenology(70, 'foret'));
	});

	it('returns the same snapshot when the coefficient is 1', () => {
		const gdd = buildBaseAgriData().gdd;
		expect(scaleGddSnapshot(gdd, 1)).toBe(gdd);
	});

	it('keeps phenology null for evergreens', () => {
		const gdd = {
			...buildBaseAgriData().gdd!,
			phenology: null,
			phenologyUnavailableReason: 'evergreen'
		};

		expect(scaleGddSnapshot(gdd, 0.7)?.phenology).toBeNull();
	});

	it('drops logistic phenology when a shaded late-season snapshot is scaled', () => {
		const base = {
			...buildBaseAgriData(),
			fetchedAt: '2026-10-15T12:00:00.000Z'
		};
		const scaled = scaleGddSnapshot(base.gdd, 0.7, {
			latitude: base.latitude,
			referenceDate: new Date(base.fetchedAt)
		});
		expect(scaled?.phenology).toBeNull();
		expect(scaled?.phenologyUnavailableCode).toBe('late_season');
	});
});
