import { describe, expect, it } from 'vitest';
import { matchHarvestSpecies } from '$lib/geo/matchHarvestSpecies';
import { resolveYrsLocalization } from '$lib/geo/yrsLocalization';
import { computeYrsConfidence, computeYamadoriReadinessScore } from '$lib/utils/yrs';
import type { AgriData } from '$lib/types/agri';
import { estimatePhenology } from '$lib/utils/gdd';

describe('matchHarvestSpecies', () => {
	it('matches canonical and aliases with accent-insensitive normalize', () => {
		expect(matchHarvestSpecies('Hainbuche', 'Charme commun', ['Hainbuche', 'Hornbeam'])).toBe(
			true
		);
		expect(matchHarvestSpecies('Érable du Japon', 'Japanese maple', ['Érable du Japon'])).toBe(
			true
		);
		expect(matchHarvestSpecies('Unknown', 'Charme commun', ['Hainbuche'])).toBe(false);
	});
});

describe('resolveYrsLocalization', () => {
	it('is local inside app countries and generic outside', () => {
		expect(resolveYrsLocalization(47.3, -1.5)).toBe('local'); // FR
		expect(resolveYrsLocalization(35.68, 139.65)).toBe('local'); // JP
		expect(resolveYrsLocalization(-15.0, -47.0)).toBe('generic'); // Brasília
	});
});

function buildIdealAgriData(lat = 47.5, lon = -0.5): AgriData {
	return {
		fetchedAt: '2026-06-22T12:00:00.000Z',
		latitude: lat,
		longitude: lon,
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
		hydricStressKs: 1,
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

describe('YRS generic localization', () => {
	it('caps confidence at medium outside supported countries', () => {
		const data = buildIdealAgriData(-15.0, -47.0);
		expect(
			computeYrsConfidence(
				data,
				{ species: 'Hêtre commun', observedPhenologyStage: 'debourrement' },
				'generic'
			)
		).toBe('medium');
	});

	it('sets localization on the snapshot', () => {
		const local = computeYamadoriReadinessScore(buildIdealAgriData(47.3, -1.5));
		const generic = computeYamadoriReadinessScore(buildIdealAgriData(-15.0, -47.0));
		expect(local.localization).toBe('local');
		expect(generic.localization).toBe('generic');
	});
});
