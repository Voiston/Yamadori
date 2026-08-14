import { describe, expect, it } from 'vitest';
import type { AgriData } from '$lib/types/agri';
import { applyEnvironmentExposure } from '$lib/utils/adjustedClimate';
import { estimatePhenology } from '$lib/utils/gdd';
import {
	applyYrsConfidenceGate,
	computeYamadoriReadinessScore,
	computeYrsConfidence,
	determineYrsDecision,
	getClimateScoreBreakdown,
	getCombinedYamadoriVerdict,
	getHydricScoreBreakdown,
	getPhenologyScoreBreakdown,
	getPrimaryYrsConfidenceGap,
	getYrsBannerClasses,
	getYrsConfidenceGaps,
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
		hydricStressKs: 1,
		wsi: 10,
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
		// GDD+WSI+estimated phenology = 5 → medium; high needs ≥6
		expect(result.confidence).toBe('medium');
	});

	it('gates OPTIMAL away and uses a low-confidence summary when signals are missing', () => {
		const result = computeYamadoriReadinessScore({
			...buildIdealAgriData(),
			gdd: null,
			hydricStressKs: null,
			wsi: null,
			waterBalance7dMm: null
		});
		expect(result.confidence).toBe('low');
		expect(result.decision).not.toBe('OPTIMAL');
		expect(result.summary?.toLowerCase()).toMatch(/confiance|confidence|konfidenz|confidenza/);
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
			frostMinNext7dC: -8,
			hydricStressKs: 0.1,
			wsi: -8,
			waterBalance7dMm: -12
		});
		expect(result.score).toBeLessThan(ideal.score - 15);
		expect(result.layers.stressPenalty).toBeGreaterThan(0);
	});

	it('applies species-specific GDD windows', () => {
		const data = {
			...buildIdealAgriData(),
			gdd: {
				...buildIdealAgriData().gdd!,
				baseCategory: 'standard' as const,
				cumulativeSinceJan1: 100,
				phenology: estimatePhenology(100, 'standard')
			}
		};
		const montagnarde = getClimateScoreBreakdown(data, { species: 'Mélèze' });
		const foret = getClimateScoreBreakdown(data, { species: 'Charme commun' });
		const gddMontagnarde = montagnarde.items.find((item) => item.label.includes('GDD'));
		const gddForet = foret.items.find((item) => item.label.includes('GDD'));

		expect(gddMontagnarde?.points).toBe(15);
		expect(gddForet?.points).toBe(8);
		expect(montagnarde.total).toBeGreaterThan(foret.total);
	});

	it('attenuates stress via upstream exposure, not a final score multiplier', () => {
		const stressed = {
			...buildIdealAgriData(),
			windSpeedKmh: 40,
			windStressIndex: 75,
			radiationStressIndex: 75,
			et0TodayMm: 4,
			et0Past7dMeanMm: 4,
			et0Trend7dMeanMm: 4,
			et0Past7dSumMm: 28,
			et0Forecast7dSumMm: 28,
			waterBalance7dMm: -15,
			wsi: -5,
			shortwaveRadiationCurrentWm2: 800,
			shortwaveRadiationMaxTodayWm2: 900
		};

		const openAdjusted = applyEnvironmentExposure(stressed, stressed.gdd, 'OPEN');
		const forestAdjusted = applyEnvironmentExposure(stressed, stressed.gdd, 'FOREST_DENSE');

		const open = computeYamadoriReadinessScore(
			{ ...openAdjusted.data, gdd: openAdjusted.gdd },
			{ environmentExposure: 'OPEN' }
		);
		const forest = computeYamadoriReadinessScore(
			{ ...forestAdjusted.data, gdd: forestAdjusted.gdd },
			{ environmentExposure: 'FOREST_DENSE' }
		);

		expect(open.score).toBeLessThan(100);
		expect(forest.score).toBeGreaterThan(open.score);
		expect(forest.layers.stressPenalty).toBeLessThanOrEqual(open.layers.stressPenalty);
	});

	it('applies harvest-calendar malus when outside regional window', () => {
		const data = {
			...buildIdealAgriData(),
			latitude: -33.87,
			longitude: 151.21,
			fetchedAt: '2026-01-15T12:00:00.000Z'
		};
		const inSeason = computeYamadoriReadinessScore(
			{ ...data, fetchedAt: '2026-07-15T12:00:00.000Z' },
			{ species: 'Banksia' }
		);
		const outOfSeason = computeYamadoriReadinessScore(data, { species: 'Banksia' });

		expect(outOfSeason.layers.phenology).toBeLessThan(inSeason.layers.phenology);
		expect(outOfSeason.summary?.toLowerCase()).toMatch(/calend|fenêtre|window|fuera|fuori|außer/);
	});

	it('scores pointe_verte between swollen buds and bud break', () => {
		const data = buildIdealAgriData();
		const swollen = getPhenologyScoreBreakdown(data, {
			observedPhenologyStage: 'bourgeon_gonfle'
		});
		const greenTip = getPhenologyScoreBreakdown(data, {
			observedPhenologyStage: 'pointe_verte'
		});
		const budBreak = getPhenologyScoreBreakdown(data, {
			observedPhenologyStage: 'debourrement'
		});
		expect(greenTip.total).toBeGreaterThan(swollen.total);
		expect(greenTip.total).toBeLessThanOrEqual(budBreak.total);
	});

	it('scores pine candle stages when observed', () => {
		const data = buildIdealAgriData();
		const candle = getPhenologyScoreBreakdown(data, {
			species: 'Pin sylvestre',
			observedPhenologyStage: 'chandelle'
		});
		const brush = getPhenologyScoreBreakdown(data, {
			species: 'Pin sylvestre',
			observedPhenologyStage: 'pinceau'
		});
		const candleStage = candle.items.find((item) => item.points === 25);
		const brushStage = brush.items.find((item) => item.points === 10);
		expect(candleStage).toBeTruthy();
		expect(brushStage).toBeTruthy();
		expect(candle.total).toBeGreaterThan(brush.total);
	});

	it('applies aoutement and leaf-fall bonuses in late-season months', () => {
		const autumnData = {
			...buildIdealAgriData(),
			fetchedAt: '2026-10-15T12:00:00.000Z'
		};
		const without = getPhenologyScoreBreakdown(autumnData, {
			observedPhenologyStage: 'dormance'
		});
		const withLate = getPhenologyScoreBreakdown(autumnData, {
			observedPhenologyStage: 'dormance',
			aoutementStatus: 'aoute',
			leafFallPct: 100
		});
		expect(withLate.total).toBeGreaterThan(without.total);
		expect(withLate.items.some((item) => item.points === 10)).toBe(true);
	});

	it('penalizes 0% leaf fall more than 25% in late-season months', () => {
		const autumnData = {
			...buildIdealAgriData(),
			fetchedAt: '2026-10-15T12:00:00.000Z'
		};
		const atZero = getPhenologyScoreBreakdown(autumnData, {
			observedPhenologyStage: 'dormance',
			leafFallPct: 0
		});
		const at25 = getPhenologyScoreBreakdown(autumnData, {
			observedPhenologyStage: 'dormance',
			leafFallPct: 25
		});
		expect(atZero.total).toBeLessThan(at25.total);
		expect(atZero.items.some((item) => item.points === -5)).toBe(true);
	});

	it('ignores aoutement and leaf-fall outside late-season months', () => {
		const springData = {
			...buildIdealAgriData(),
			fetchedAt: '2026-04-15T12:00:00.000Z'
		};
		const without = getPhenologyScoreBreakdown(springData, {
			observedPhenologyStage: 'debourrement'
		});
		const withLate = getPhenologyScoreBreakdown(springData, {
			observedPhenologyStage: 'debourrement',
			aoutementStatus: 'aoute',
			leafFallPct: 100
		});
		expect(withLate.total).toBe(without.total);
	});
});

describe('computeYrsConfidence', () => {
	it('is high when GDD, WSI and observed phenology are present', () => {
		expect(
			computeYrsConfidence(buildIdealAgriData(), {
				species: 'Hêtre commun',
				observedPhenologyStage: 'debourrement'
			})
		).toBe('high');
	});

	it('is medium for GDD+WSI+estimated phenology without observation (score 5)', () => {
		expect(computeYrsConfidence(buildIdealAgriData())).toBe('medium');
	});

	it('is low when GDD and hydric signals are missing', () => {
		expect(
			computeYrsConfidence({
				...buildIdealAgriData(),
				gdd: null,
				hydricStressKs: null,
				wsi: null,
				waterBalance7dMm: null
			})
		).toBe('low');
	});

	it('is medium when only partial signals are available', () => {
		expect(
			computeYrsConfidence({
				...buildIdealAgriData(),
				hydricStressKs: null,
				wsi: null,
				waterBalance7dMm: 2,
				gdd: {
					...buildIdealAgriData().gdd!,
					phenology: null
				}
			})
		).toBe('medium');
	});
});

describe('getYrsConfidenceGaps', () => {
	it('lists missing phenology and unmapped species first', () => {
		const gaps = getYrsConfidenceGaps(buildIdealAgriData(), {});
		expect(gaps).toContain('observedPhenology');
		expect(gaps).toContain('speciesMapped');
		expect(getPrimaryYrsConfidenceGap(buildIdealAgriData(), {})).toBe('observedPhenology');
	});

	it('omits phenology gap when observation is present', () => {
		const gaps = getYrsConfidenceGaps(buildIdealAgriData(), {
			species: 'Hêtre commun',
			observedPhenologyStage: 'debourrement'
		});
		expect(gaps).not.toContain('observedPhenology');
		expect(gaps).not.toContain('speciesMapped');
	});

	it('does not flag evergreen catalog species as unmapped', () => {
		expect(getYrsConfidenceGaps(buildIdealAgriData(), { species: 'Banksia' })).not.toContain(
			'speciesMapped'
		);
		expect(
			getYrsConfidenceGaps(buildIdealAgriData(), { species: 'Pinus thunbergii' })
		).not.toContain('speciesMapped');
		expect(
			getYrsConfidenceGaps(buildIdealAgriData(), { species: 'Utah juniper' })
		).not.toContain('speciesMapped');
	});
});

describe('applyYrsConfidenceGate', () => {
	it('downgrades OPTIMAL to ACCEPTABLE when confidence is low', () => {
		expect(applyYrsConfidenceGate(85, 'low')).toBe('ACCEPTABLE');
		expect(applyYrsConfidenceGate(85, 'medium')).toBe('OPTIMAL');
		expect(applyYrsConfidenceGate(70, 'low')).toBe('ACCEPTABLE');
	});
});

describe('neutral fallbacks', () => {
	it('uses stricter points when GDD, phenology or hydric data are missing', () => {
		const noGdd = getClimateScoreBreakdown({ ...buildIdealAgriData(), gdd: null });
		expect(noGdd.items.some((item) => item.points === 2)).toBe(true);

		const noPhenology = getPhenologyScoreBreakdown(
			{ ...buildIdealAgriData(), gdd: null },
			{}
		);
		expect(noPhenology.items.some((item) => item.points === 4)).toBe(true);

		const noHydric = getHydricScoreBreakdown({
			...buildIdealAgriData(),
			hydricStressKs: null,
			wsi: null,
			waterBalance7dMm: null
		});
		expect(noHydric.items.some((item) => item.points === 3)).toBe(true);
	});
});

describe('getCombinedYamadoriVerdict', () => {
	it('returns good candidate when potential and timing align', () => {
		expect(getCombinedYamadoriVerdict(8, { score: 70 })).toMatch(/candidat|candidate|Kandidat/i);
	});

	it('returns wait when potential is high but timing is poor', () => {
		expect(getCombinedYamadoriVerdict(8, { score: 30 })).toMatch(/attendre|wait|warten|attendere|esperar/i);
	});

	it('returns limited interest when timing is good but potential is low', () => {
		expect(getCombinedYamadoriVerdict(2, { score: 85 })).toMatch(/limité|limited|begrenzt|limitato/i);
	});

	it('returns null when inputs are incomplete or middling', () => {
		expect(getCombinedYamadoriVerdict(null, { score: 70 })).toBeNull();
		expect(getCombinedYamadoriVerdict(5, { score: 70 })).toBeNull();
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

	it('lists frost penalty contributors with proportional frost points', () => {
		const breakdown = getYrsScoreBreakdown({
			...buildIdealAgriData(),
			frostEventsPast7d: 1,
			frostRiskNext7d: true,
			frostMinNext7dC: -8,
			heatStressDaysForecast7d: 2
		});

		// frost: min(25, 5 + 5*1 + severity5) = 15; heat 2 days = 5 → 20
		expect(breakdown.stressPenalty.total).toBe(20);
		expect(breakdown.stressPenalty.items).toHaveLength(2);
		expect(breakdown.stressPenalty.items[0]?.points).toBe(15);
	});

	it('scores hydric from FAO-proxy Ks and forecast ET₀ malus', () => {
		const good = getHydricScoreBreakdown(buildIdealAgriData());
		expect(good.total).toBe(20);

		const stressed = getHydricScoreBreakdown({
			...buildIdealAgriData(),
			hydricStressKs: 0.3,
			futureStressRiskMm: 20
		});
		expect(stressed.total).toBeLessThan(good.total);
		expect(stressed.items.some((item) => item.points < 0)).toBe(true);
	});

	it('differentiates Quercus vs Betula GDD climate windows', () => {
		const data = {
			...buildIdealAgriData(),
			gdd: {
				...buildIdealAgriData().gdd!,
				cumulativeSinceJan1: 100
			}
		};
		const birch = getClimateScoreBreakdown(data, { species: 'Bouleau' });
		const oak = getClimateScoreBreakdown(data, { species: 'Chêne sessile' });
		const birchGdd = birch.items.find((item) => item.label.includes('GDD'))?.points ?? 0;
		const oakGdd = oak.items.find((item) => item.label.includes('GDD'))?.points ?? 0;
		expect(birchGdd).toBeGreaterThan(oakGdd);
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
