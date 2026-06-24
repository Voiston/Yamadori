import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import { estimatePhenology } from '$lib/utils/gdd';
import {
	assessSoilNightDropRiskLevel,
	formatSoilNightDropAttenuationLabel,
	getSoilNightDropActivationWeight,
	getSoilNightDropStressPoints,
	getSoilNightDropStabilityScore,
	isSoilNightDropPenalized
} from './soilNightDrop';

function buildAgriData(
	overrides: Partial<AgriData> & { gddCumulative?: number; phenology?: AgriData['gdd'] }
): AgriData {
	const gdd =
		overrides.phenology ??
		(overrides.gddCumulative !== undefined
			? {
					baseTempC: 4.5,
					baseCategory: 'foret' as const,
					cumulativeSinceJan1: overrides.gddCumulative,
					last7dSum: 40,
					dailySeries: [],
					phenology: estimatePhenology(overrides.gddCumulative, 'foret'),
					phenologyUnavailableReason: null,
					speciesLabel: 'Hêtre commun'
				}
			: null);

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
		soilBrutalNightDrop: true,
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
		gdd,
		yrs: null,
		...overrides
	};
}

describe('getSoilNightDropActivationWeight', () => {
	it('returns full weight for dormance and bourgeons gonflés', () => {
		const data = buildAgriData({ gddCumulative: 120 });
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'dormance' })
		).toBe(1);
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'bourgeon_gonfle' })
		).toBe(1);
	});

	it('returns stage-specific weights for later phenology', () => {
		const data = buildAgriData({ gddCumulative: 350 });
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'debourrement' })
		).toBe(0.75);
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'feuillaison' })
		).toBe(0.25);
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'croissance_active' })
		).toBe(0);
	});

	it('uses estimated phenology from GDD when no observation', () => {
		const data = buildAgriData({ gddCumulative: 220 });
		const weight = getSoilNightDropActivationWeight(data);
		expect(weight).toBeGreaterThan(0);
		expect(weight).toBeLessThanOrEqual(1);
	});

	it('falls back to progressive GDD weight when phenology estimate is absent', () => {
		const data = buildAgriData({
			phenology: {
				baseTempC: 4.5,
				baseCategory: 'foret',
				cumulativeSinceJan1: 450,
				last7dSum: 40,
				dailySeries: [],
				phenology: null,
				phenologyUnavailableReason: null,
				speciesLabel: 'Hêtre commun'
			}
		});
		const weight = getSoilNightDropActivationWeight(data);
		expect(weight).toBeGreaterThan(0.35);
		expect(weight).toBeLessThan(0.4);
	});

	it('returns zero weight for advanced summer GDD', () => {
		const data = buildAgriData({ gddCumulative: 620 });
		expect(getSoilNightDropActivationWeight(data)).toBe(0);
	});

	it('returns full weight when GDD is unavailable', () => {
		const data = buildAgriData({ gdd: null, phenology: null });
		expect(getSoilNightDropActivationWeight(data)).toBe(1);
	});

	it('prioritizes observed phenology over GDD estimate', () => {
		const data = buildAgriData({ gddCumulative: 620 });
		expect(
			getSoilNightDropActivationWeight(data, { observedPhenologyStage: 'bourgeon_gonfle' })
		).toBe(1);
	});
});

describe('soil night drop helpers', () => {
	it('scales stress points with activation weight', () => {
		expect(getSoilNightDropStressPoints(1)).toBe(5);
		expect(getSoilNightDropStressPoints(0.75)).toBe(4);
		expect(getSoilNightDropStressPoints(0.25)).toBe(1);
		expect(getSoilNightDropStressPoints(0)).toBe(0);
	});

	it('interpolates stability score between penalized and neutral', () => {
		expect(getSoilNightDropStabilityScore(true, 1)).toBe(30);
		expect(getSoilNightDropStabilityScore(true, 0.5)).toBe(65);
		expect(getSoilNightDropStabilityScore(true, 0)).toBe(100);
		expect(getSoilNightDropStabilityScore(false, 1)).toBe(100);
	});

	it('maps risk levels from weight thresholds', () => {
		expect(assessSoilNightDropRiskLevel(true, 1)).toBe('Dangereux');
		expect(assessSoilNightDropRiskLevel(true, 0.75)).toBe('Dangereux');
		expect(assessSoilNightDropRiskLevel(true, 0.25)).toBe('Passable');
		expect(assessSoilNightDropRiskLevel(true, 0)).toBe('Excellent');
		expect(assessSoilNightDropRiskLevel(false, 1)).toBe('Excellent');
	});

	it('detects penalization only above minimum weight', () => {
		const data = buildAgriData({
			phenology: {
				baseTempC: 4.5,
				baseCategory: 'foret',
				cumulativeSinceJan1: 450,
				last7dSum: 40,
				dailySeries: [],
				phenology: null,
				phenologyUnavailableReason: null,
				speciesLabel: 'Hêtre commun'
			}
		});
		expect(isSoilNightDropPenalized(data)).toBe(true);
		expect(isSoilNightDropPenalized(data, {}, 0.25)).toBe(true);
		expect(isSoilNightDropPenalized(buildAgriData({ gddCumulative: 620 }), {}, 0.25)).toBe(
			false
		);
	});

	it('formats attenuation labels for UI', () => {
		const summer = buildAgriData({ gddCumulative: 620 });
		expect(formatSoilNightDropAttenuationLabel(summer, {}, 0)).toBe(
			'critère ignoré (pleine végétation)'
		);

		const spring = buildAgriData({
			phenology: {
				baseTempC: 4.5,
				baseCategory: 'foret',
				cumulativeSinceJan1: 450,
				last7dSum: 40,
				dailySeries: [],
				phenology: null,
				phenologyUnavailableReason: null,
				speciesLabel: 'Hêtre commun'
			}
		});
		const label = formatSoilNightDropAttenuationLabel(spring, {}, 0.25);
		expect(label).toContain('GDD 450');
	});
});
