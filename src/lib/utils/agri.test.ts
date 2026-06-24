import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import type { AgriData } from '$lib/types/agri';
import { estimatePhenology } from '$lib/utils/gdd';
import {
	assessYamadoriRisk,
	assessYamadoriRiskDetails,
	assessYamadoriMetricRisks,
	assessYrsDetailRisks,
	assessSoil18cmRisk,
	computeViabilityScore,
	computeMetricViabilityScores,
	computeEt0Past7dMean,
	computeEt0Trend7dMean,
	computeWeeklyViability,
	countConsecutiveSoilStableDays,
	detectBrutalNightDrop,
	determineViabilityGoNoGo,
	fetchAgriDataBase,
	findCurrentHourIndex,
	findTodayDailyIndex,
	getForecastFrostMin,
	getAgriMetricCardClass,
	getSoil18cmZoneLabel,
	isSoilTrend7dRising,
	parseAgriForecastResponse,
	piecewiseLinearScore,
	riskLevelToScore,
	sumPastPrecipitation,
	sumPrecipitation,
	worstAgriRisk
} from './agri';

const idealConditions: AgriData = {
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
	soilDailyHistory7d: Array.from({ length: 7 }, (_, index) => ({
		date: `2026-06-${String(15 + index).padStart(2, '0')}`,
		mean6cmC: 10,
		mean18cmC: 11
	})),
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
	gdd: null,
	yrs: null
};

function springGdd(cumulativeSinceJan1: number): AgriData['gdd'] {
	return {
		baseTempC: 4.5,
		baseCategory: 'foret',
		cumulativeSinceJan1,
		last7dSum: 40,
		dailySeries: [],
		phenology: estimatePhenology(cumulativeSinceJan1, 'foret'),
		phenologyUnavailableReason: null,
		speciesLabel: 'Hêtre commun'
	};
}

function buildMockBody(referenceDate: Date) {
	const today = '2026-06-22';
	const hourlyTimes: string[] = [];
	for (let dayOffset = -7; dayOffset <= 7; dayOffset += 1) {
		const date = new Date(referenceDate);
		date.setDate(date.getDate() + dayOffset);
		const day = date.toISOString().slice(0, 10);
		for (let hour = 0; hour < 24; hour += 1) {
			hourlyTimes.push(`${day}T${String(hour).padStart(2, '0')}:00`);
		}
	}

	return {
		hourly: {
			time: hourlyTimes,
			temperature_2m: hourlyTimes.map((_, i) => 20 + (i % 5)),
			relative_humidity_2m: hourlyTimes.map(() => 65),
			wind_speed_10m: hourlyTimes.map(() => 12),
			soil_temperature_6cm: hourlyTimes.map(() => 10),
			soil_temperature_18cm: hourlyTimes.map(() => 11),
			shortwave_radiation: hourlyTimes.map((time) => {
				const hour = Number(time.slice(11, 13));
				if (hour >= 10 && hour <= 16) return 300;
				return 50;
			})
		},
		daily: {
			time: [
				'2026-06-15',
				'2026-06-16',
				'2026-06-17',
				'2026-06-18',
				'2026-06-19',
				'2026-06-20',
				'2026-06-21',
				today,
				'2026-06-23',
				'2026-06-24',
				'2026-06-25',
				'2026-06-26',
				'2026-06-27',
				'2026-06-28'
			],
			precipitation_sum: [1, 2, 2, 3, 5, 4, 6, 1, 0, 0, 2, 1, 0, 0],
			temperature_2m_min: [4, 5, 6, 5, 6, 7, 3, 2, 4, 5, 6, 4, 5, 3],
			temperature_2m_max: [22, 24, 25, 26, 27, 28, 29, 24, 25, 26, 27, 28, 29, 30],
			et0_fao_evapotranspiration: [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]
		}
	};
}

describe('findCurrentHourIndex', () => {
	it('returns the first slot at or after the reference time', () => {
		const times = ['2026-06-22T10:00', '2026-06-22T11:00', '2026-06-22T12:00', '2026-06-22T13:00'];
		const index = findCurrentHourIndex(times, new Date('2026-06-22T11:30:00'));
		expect(index).toBe(2);
	});
});

describe('findTodayDailyIndex', () => {
	it('returns the index matching today', () => {
		const times = ['2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23'];
		expect(findTodayDailyIndex(times, new Date('2026-06-22T12:00:00'))).toBe(2);
	});
});

describe('sumPrecipitation', () => {
	it('sums the first N daily values', () => {
		expect(sumPrecipitation([2.5, 1.0, 0.5, 3.0], 3)).toBe(4);
	});
});

describe('sumPastPrecipitation', () => {
	it('sums precipitation for days before today only', () => {
		const dailyTimes = ['2026-06-19', '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23'];
		const dailyPrecip = [1, 2, 3, 99, 100];
		expect(
			sumPastPrecipitation(dailyTimes, dailyPrecip, 3, new Date('2026-06-22T12:00:00'))
		).toBe(6);
	});
});

describe('countConsecutiveSoilStableDays', () => {
	it('counts the longest run in the 8–15 °C range', () => {
		expect(countConsecutiveSoilStableDays([10, 11, 12, 13, 4])).toBe(4);
	});
});

describe('detectBrutalNightDrop', () => {
	it('detects a large mean-min gap', () => {
		expect(detectBrutalNightDrop([12], [6])).toBe(true);
	});

	it('detects a large day-to-day drop', () => {
		expect(detectBrutalNightDrop([12, 7], [11, 6])).toBe(true);
	});

	it('returns false for stable days', () => {
		expect(detectBrutalNightDrop([10, 11], [9, 10])).toBe(false);
	});
});

describe('isSoilTrend7dRising', () => {
	it('returns true when the last 3 days are warmer than the first 3', () => {
		expect(isSoilTrend7dRising([8, 8.5, 9, 10, 11, 12, 13])).toBe(true);
	});

	it('returns false for flat temperatures', () => {
		expect(isSoilTrend7dRising([10, 10, 10, 10, 10, 10, 10])).toBe(false);
	});
});

describe('getForecastFrostMin', () => {
	it('returns the minimum forecast temperature from today', () => {
		const dailyTimes = ['2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24'];
		const mins = [5, 4, -4, 2];
		expect(getForecastFrostMin(dailyTimes, mins, 3, new Date('2026-06-22T12:00:00'))).toBe(-4);
	});
});

describe('computeEt0Past7dMean', () => {
	it('averages ET0 over the 7 complete days before today', () => {
		const dailyTimes = [
			'2026-06-14',
			'2026-06-15',
			'2026-06-16',
			'2026-06-17',
			'2026-06-18',
			'2026-06-19',
			'2026-06-20',
			'2026-06-21',
			'2026-06-22'
		];
		const dailyEt0 = [1, 2, 3, 4, 5, 6, 7, 8, 99];
		const mean = computeEt0Past7dMean(
			dailyTimes,
			dailyEt0,
			new Date('2026-06-22T12:00:00')
		);
		expect(mean).toBe(5);
	});
});

describe('computeEt0Trend7dMean', () => {
	it('averages ET0 over the next 7 days', () => {
		const dailyTimes = [
			'2026-06-22',
			'2026-06-23',
			'2026-06-24',
			'2026-06-25',
			'2026-06-26',
			'2026-06-27',
			'2026-06-28',
			'2026-06-29'
		];
		const dailyEt0 = [1, 2, 3, 4, 5, 6, 7, 8];
		const mean = computeEt0Trend7dMean(
			dailyTimes,
			dailyEt0,
			new Date('2026-06-22T12:00:00')
		);
		expect(mean).toBe(4);
	});
});

describe('parseAgriForecastResponse', () => {
	it('parses oneshot and trend metrics from past + forecast data', () => {
		const referenceDate = new Date('2026-06-22T12:00:00');
		const result = parseAgriForecastResponse(
			buildMockBody(referenceDate),
			47.5,
			-0.5,
			referenceDate
		);

		expect(result.windSpeedKmh).toBe(12);
		expect(result.rainPast3dMm).toBe(15);
		expect(result.rainPast7dMm).toBe(23);
		expect(result.soilConsecutiveStableDays).toBeGreaterThanOrEqual(5);
		expect(result.soilMean5dC).toBe(10);
		expect(result.soilMean6cm7dC).toBe(10);
		expect(result.soilMean18cm7dC).toBe(11);
		expect(result.soilDailyHistory7d).toHaveLength(7);
		expect(result.soilDailyHistory7d[0]).toEqual({
			date: '2026-06-15',
			mean6cmC: 10,
			mean18cmC: 11
		});
		expect(result.soilTemperature6cmC).toBe(10);
		expect(result.soilTemperature18cmC).toBe(11);
		expect(result.soilBrutalNightDrop).toBe(false);
		expect(result.frostMinNext7dC).toBe(2);
		expect(result.et0TodayMm).toBe(0.8);
		expect(result.et0Past7dMeanMm).toBe(0.8);
		expect(result.et0Trend7dMeanMm).toBe(0.8);
		expect(result.waterBalance7dMm).toBe(17.4);
		expect(result.soilHeatBufferC).toBe(-1);
		expect(result.soilStabilityScore).toBeGreaterThan(80);
		expect(result.shortwaveRadiationMaxTodayWm2).toBe(300);
		expect(result.weeklyViability).toBeNull();
	});
});

describe('assessSoil18cmRisk', () => {
	it('returns Excellent for 9–13 °C', () => {
		expect(assessSoil18cmRisk(10)).toBe('Excellent');
		expect(assessSoil18cmRisk(9)).toBe('Excellent');
		expect(assessSoil18cmRisk(13)).toBe('Excellent');
	});

	it('returns Passable for 14–17 °C (zone haute exploitable)', () => {
		expect(assessSoil18cmRisk(15)).toBe('Passable');
		expect(assessSoil18cmRisk(17)).toBe('Passable');
	});

	it('returns Passable for 18 °C and above (stress hydrique)', () => {
		expect(assessSoil18cmRisk(18)).toBe('Passable');
		expect(assessSoil18cmRisk(22)).toBe('Passable');
	});

	it('returns Dangereux below 9 °C', () => {
		expect(assessSoil18cmRisk(8)).toBe('Dangereux');
	});
});

describe('getSoil18cmZoneLabel', () => {
	it('returns the correct zone labels', () => {
		expect(getSoil18cmZoneLabel(11)).toBe(m.yrs_verdict_good_candidate());
		expect(getSoil18cmZoneLabel(15)).toBe(m.agri_verdict_soil_high({ temp: '15' }));
		expect(getSoil18cmZoneLabel(19)).toBe(m.agri_verdict_soil_high({ temp: '19' }));
		expect(getSoil18cmZoneLabel(7)).toBe(m.agri_verdict_soil_cold({ temp: '7' }));
	});
});

describe('assessYamadoriMetricRisks', () => {
	it('returns per-metric risk levels', () => {
		const metrics = assessYamadoriMetricRisks(idealConditions);
		expect(metrics.air).toBe('Excellent');
		expect(metrics.wind).toBe('Excellent');
		expect(metrics.soil).toBe('Excellent');
		expect(metrics.frost).toBe('Excellent');
	});

	it('flags wind as Dangereux above 35 km/h', () => {
		expect(assessYamadoriMetricRisks({ ...idealConditions, windSpeedKmh: 36 }).wind).toBe(
			'Dangereux'
		);
	});

	it('flags soil as Passable when 18 cm is in stress hydrique zone', () => {
		expect(
			assessYamadoriMetricRisks({ ...idealConditions, soilTemperature18cmC: 19 }).soil
		).toBe('Passable');
	});

	it('flags ET0 as Excellent at or below 1 mm/j', () => {
		expect(assessYamadoriMetricRisks({ ...idealConditions, et0Trend7dMeanMm: 1 }).et0).toBe(
			'Excellent'
		);
	});

	it('flags ET0 as Dangereux at or above 5 mm/j (forecast)', () => {
		expect(assessYamadoriMetricRisks({ ...idealConditions, et0Trend7dMeanMm: 5 }).et0).toBe(
			'Dangereux'
		);
	});

	it('flags ET0 as Dangereux when past 7d mean is high even if forecast is low', () => {
		expect(
			assessYamadoriMetricRisks({
				...idealConditions,
				et0Past7dMeanMm: 5,
				et0Trend7dMeanMm: 0.8
			}).et0
		).toBe('Dangereux');
	});

	it('flags radiation as Dangereux above 600 W/m²', () => {
		expect(
			assessYamadoriMetricRisks({
				...idealConditions,
				shortwaveRadiationMaxTodayWm2: 650
			}).radiation
		).toBe('Dangereux');
	});
});

describe('getAgriMetricCardClass', () => {
	it('maps risk levels to semantic colors', () => {
		expect(getAgriMetricCardClass('Excellent')).toContain('emerald');
		expect(getAgriMetricCardClass('Passable')).toContain('orange');
		expect(getAgriMetricCardClass('Dangereux')).toContain('red');
	});
});

describe('assessYamadoriRisk', () => {
	it('returns Excellent for ideal scouting conditions', () => {
		expect(assessYamadoriRisk(idealConditions)).toBe('Excellent');
	});

	it('returns Dangereux when frost below -3 °C is forecast', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				frostRiskNext7d: true,
				frostMinNext7dC: -4
			})
		).toBe('Dangereux');
	});

	it('returns Dangereux for wind above 35 km/h', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				windSpeedKmh: 36
			})
		).toBe('Dangereux');
	});

	it('returns Excellent when today ET0 is high but 7-day trend is low', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				et0TodayMm: 4,
				et0Trend7dMeanMm: 0.9
			})
		).toBe('Excellent');
	});

	it('returns Dangereux for waterlogged past rain', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				rainPast3dMm: 45
			})
		).toBe('Dangereux');
	});

	it('returns Passable for stable soil with brutal night drop in spring', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				soilBrutalNightDrop: true,
				gdd: springGdd(220)
			})
		).toBe('Passable');
	});

	it('returns Excellent for stable soil with brutal night drop in summer', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				soilBrutalNightDrop: true,
				gdd: springGdd(620)
			})
		).toBe('Excellent');
	});

	it('returns Passable for stable soil without rising trend', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				soilTrend7dRising: false
			})
		).toBe('Passable');
	});

	it('returns Passable for 18 cm soil stress hydrique', () => {
		const details = assessYamadoriRiskDetails({
			...idealConditions,
			soilTemperature18cmC: 20
		});
		expect(details.level).toBe('Passable');
		expect(details.reason).toContain('stress hydrique');
	});

	it('returns Dangereux with only two stable soil days', () => {
		expect(
			assessYamadoriRisk({
				...idealConditions,
				soilConsecutiveStableDays: 2
			})
		).toBe('Dangereux');
	});
});

describe('assessYamadoriRiskDetails', () => {
	it('includes frost reason when gel is forecast', () => {
		const details = assessYamadoriRiskDetails({
			...idealConditions,
			frostRiskNext7d: true,
			frostMinNext7dC: -4
		});
		expect(details.level).toBe('Dangereux');
		expect(details.reason).toContain('Gel prévu');
	});
});

describe('riskLevelToScore', () => {
	it('maps risk levels to unit scores', () => {
		expect(riskLevelToScore('Excellent')).toBe(100);
		expect(riskLevelToScore('Passable')).toBe(55);
		expect(riskLevelToScore('Dangereux')).toBe(0);
	});
});

describe('piecewiseLinearScore', () => {
	it('interpolates linearly between anchors', () => {
		expect(
			piecewiseLinearScore(12.5, [
				{ value: 0, score: 100 },
				{ value: 25, score: 55 }
			])
		).toBe(78);
	});

	it('clamps to edge scores outside the anchor range', () => {
		expect(
			piecewiseLinearScore(40, [
				{ value: 0, score: 100 },
				{ value: 25, score: 55 },
				{ value: 35, score: 0 }
			])
		).toBe(0);
	});
});

describe('computeMetricViabilityScores', () => {
	it('returns decreasing wind scores as wind increases', () => {
		const low = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 12 }).wind;
		const mid = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 24 }).wind;
		const high = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 30 }).wind;

		expect(low).toBeGreaterThan(mid);
		expect(mid).toBeGreaterThan(high);
	});

	it('keeps wind scores close across the passable threshold', () => {
		const before = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 24 }).wind;
		const after = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 25 }).wind;

		expect(Math.abs(before - after)).toBeLessThan(5);
	});

	it('returns a low wind score near the dangerous threshold', () => {
		const score = computeMetricViabilityScores({ ...idealConditions, windSpeedKmh: 34 }).wind;
		expect(score).toBeLessThan(55);
	});
});

describe('computeViabilityScore', () => {
	it('returns a high score for ideal conditions', () => {
		expect(computeViabilityScore(idealConditions)).toBeGreaterThanOrEqual(85);
	});

	it('caps the score at 10 when a metric is Dangereux', () => {
		expect(
			computeViabilityScore({
				...idealConditions,
				frostRiskNext7d: true,
				frostMinNext7dC: -4
			})
		).toBeLessThanOrEqual(10);
	});

	it('caps the score at 10 for dangerous wind even if other metrics are ideal', () => {
		expect(
			computeViabilityScore({
				...idealConditions,
				windSpeedKmh: 36
			})
		).toBeLessThanOrEqual(10);
	});
});

describe('determineViabilityGoNoGo', () => {
	it('returns Go for a strong score without dangerous metrics', () => {
		const metrics = assessYamadoriMetricRisks(idealConditions);
		expect(determineViabilityGoNoGo(85, metrics)).toBe('Go');
	});

	it('returns Go prudent for a passable metric despite a good score', () => {
		const metrics = assessYamadoriMetricRisks({
			...idealConditions,
			soilBrutalNightDrop: true,
			gdd: springGdd(220)
		});
		expect(determineViabilityGoNoGo(80, metrics)).toBe('Go prudent');
	});

	it('returns No-Go when a dangerous metric is present', () => {
		const metrics = assessYamadoriMetricRisks({
			...idealConditions,
			windSpeedKmh: 36
		});
		expect(determineViabilityGoNoGo(10, metrics)).toBe('No-Go');
	});
});

describe('computeWeeklyViability', () => {
	it('returns 7 days with todayScore matching the first day YRS', () => {
		const referenceDate = new Date('2026-06-22T12:00:00');
		const weekly = computeWeeklyViability(buildMockBody(referenceDate), 47.5, -0.5, referenceDate);

		expect(weekly.days).toHaveLength(7);
		expect(weekly.todayScore).toBe(weekly.days[0]?.score);
		expect(weekly.days[0]?.deltaFromToday).toBe(0);
		expect(weekly.days[0]?.yrsDecision).toBeTruthy();
		expect(weekly.bestDayDate).toBeTruthy();
		expect(weekly.bestDayScore).toBeGreaterThan(0);
	});

	it('identifies the day with the highest YRS as bestDayDate', () => {
		const referenceDate = new Date('2026-06-22T12:00:00');
		const weekly = computeWeeklyViability(buildMockBody(referenceDate), 47.5, -0.5, referenceDate);
		const maxScore = Math.max(...weekly.days.map((day) => day.score));
		const bestDay = weekly.days.find((day) => day.date === weekly.bestDayDate);

		expect(bestDay?.score).toBe(maxScore);
	});
});

describe('assessYrsDetailRisks', () => {
	it('returns Excellent for ideal hydric and stress indicators', () => {
		const risks = assessYrsDetailRisks(idealConditions);
		expect(risks.gddSeason).toBe('Passable');
		expect(risks.et0Mean).toBe('Excellent');
		expect(risks.air).toBe('Excellent');
		expect(risks.soil).toBe('Excellent');
		expect(risks.soilNightDrop).toBe('Excellent');
		expect(risks.hydricBalance).toBe('Excellent');
		expect(risks.wsi).toBe('Excellent');
		expect(risks.et0Cumul).toBe('Excellent');
		expect(risks.windStress).toBe('Excellent');
		expect(risks.radiationStress).toBe('Excellent');
		expect(risks.heatStress).toBe('Excellent');
		expect(risks.frostPast).toBe('Excellent');
		expect(risks.frostForecast).toBe('Excellent');
	});

	it('flags optimal GDD window as Excellent', () => {
		expect(
			assessYrsDetailRisks({
				...idealConditions,
				gdd: {
					cumulativeSinceJan1: 250,
					last7dSum: 40,
					baseTempC: 4.5,
					baseCategory: 'foret',
					speciesLabel: 'Hêtre',
					dailySeries: [],
					phenology: null,
					phenologyUnavailableReason: null
				}
			}).gddSeason
		).toBe('Excellent');
	});

	it('flags negative water balance as Dangereux', () => {
		expect(
			assessYrsDetailRisks({ ...idealConditions, waterBalance7dMm: -10 }).hydricBalance
		).toBe('Dangereux');
	});

	it('flags high wind stress index as Dangereux', () => {
		expect(assessYrsDetailRisks({ ...idealConditions, windStressIndex: 75 }).windStress).toBe(
			'Dangereux'
		);
	});

	it('flags heat stress days >= 3 as Dangereux', () => {
		expect(
			assessYrsDetailRisks({
				...idealConditions,
				heatStressDaysPast7d: 2,
				heatStressDaysForecast7d: 1
			}).heatStress
		).toBe('Dangereux');
	});

	it('flags past frost events >= 2 as Dangereux', () => {
		expect(assessYrsDetailRisks({ ...idealConditions, frostEventsPast7d: 2 }).frostPast).toBe(
			'Dangereux'
		);
	});

	it('flags forecast frost risk as Dangereux', () => {
		expect(
			assessYrsDetailRisks({ ...idealConditions, frostRiskNext7d: true }).frostForecast
		).toBe('Dangereux');
	});

	it('flags brutal night drop as Dangereux in spring', () => {
		expect(
			assessYrsDetailRisks({
				...idealConditions,
				soilBrutalNightDrop: true,
				gdd: springGdd(220)
			}).soilNightDrop
		).toBe('Dangereux');
	});

	it('ignores brutal night drop in advanced summer season', () => {
		expect(
			assessYrsDetailRisks({
				...idealConditions,
				soilBrutalNightDrop: true,
				gdd: springGdd(620)
			}).soilNightDrop
		).toBe('Excellent');
	});
});

describe('worstAgriRisk', () => {
	it('returns the highest severity among risk levels', () => {
		expect(worstAgriRisk('Excellent', 'Passable', 'Excellent')).toBe('Passable');
		expect(worstAgriRisk('Excellent', 'Dangereux', 'Passable')).toBe('Dangereux');
		expect(worstAgriRisk('Excellent')).toBe('Excellent');
	});
});

describe('fetchAgriDataBase', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('throws parsed Open-Meteo error on HTTP 400', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({ error: true, reason: 'Latitude must be between -90 and 90' }),
					{ status: 400 }
				)
			)
		);

		await expect(fetchAgriDataBase(47.26, -1.52)).rejects.toThrow(
			'Open-Meteo (400) : Latitude must be between -90 and 90'
		);
	});
});
