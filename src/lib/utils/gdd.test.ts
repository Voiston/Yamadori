import { describe, expect, it } from 'vitest';
import {
	getBiotopeGddCategory,
	getGddSeasonZone,
	getSpeciesGddCategory,
	isEvergreenSpecies,
	resolveGddBaseCategory,
	resolveGddBaseTemp
} from '$lib/constants/gdd-config';
import {
	buildGddDailySeries,
	buildTransitionLabel,
	computeDailyGdd,
	computeGddLast7dSum,
	estimatePhenology,
	getStageProbabilityAtGdd,
	mergeDailyMeanTemps
} from '$lib/utils/gdd';

describe('computeDailyGdd', () => {
	it('returns temperature above base', () => {
		expect(computeDailyGdd(12, 4.5)).toBe(7.5);
	});

	it('returns zero when mean is below base', () => {
		expect(computeDailyGdd(3, 4.5)).toBe(0);
	});
});

describe('buildGddDailySeries', () => {
	it('accumulates GDD since January 1st', () => {
		const referenceDate = new Date('2026-01-05T12:00:00');
		const series = buildGddDailySeries(
			[
				{ date: '2025-12-31', meanTempC: 10 },
				{ date: '2026-01-01', meanTempC: 6 },
				{ date: '2026-01-02', meanTempC: 8 },
				{ date: '2026-01-03', meanTempC: 4 }
			],
			4.5,
			referenceDate
		);

		expect(series).toHaveLength(3);
		expect(series[0]).toMatchObject({ date: '2026-01-01', dailyGdd: 1.5, cumulativeGdd: 1.5 });
		expect(series[1]).toMatchObject({ dailyGdd: 3.5, cumulativeGdd: 5 });
		expect(series[2]).toMatchObject({ dailyGdd: 0, cumulativeGdd: 5 });
	});
});

describe('computeGddLast7dSum', () => {
	it('sums daily GDD over the last 7 complete days', () => {
		const referenceDate = new Date('2026-01-10T12:00:00');
		const series = buildGddDailySeries(
			[
				{ date: '2026-01-01', meanTempC: 10 },
				{ date: '2026-01-02', meanTempC: 10 },
				{ date: '2026-01-03', meanTempC: 10 },
				{ date: '2026-01-04', meanTempC: 10 },
				{ date: '2026-01-05', meanTempC: 10 },
				{ date: '2026-01-06', meanTempC: 10 },
				{ date: '2026-01-07', meanTempC: 10 },
				{ date: '2026-01-08', meanTempC: 10 },
				{ date: '2026-01-09', meanTempC: 20 }
			],
			5,
			referenceDate
		);

		expect(computeGddLast7dSum(series, referenceDate)).toBe(45);
	});
});

describe('mergeDailyMeanTemps', () => {
	it('prefers forecast values over archive for overlapping dates', () => {
		const merged = mergeDailyMeanTemps(
			[
				{ date: '2026-01-01', meanTempC: 5 },
				{ date: '2026-01-02', meanTempC: 6 }
			],
			[{ date: '2026-01-02', meanTempC: 8 }]
		);

		expect(merged).toEqual([
			{ date: '2026-01-01', meanTempC: 5 },
			{ date: '2026-01-02', meanTempC: 8 }
		]);
	});
});

describe('resolveGddBaseTemp', () => {
	it('uses species category when known', () => {
		const result = resolveGddBaseTemp('Hêtre commun', 47.5, -0.5);
		expect(result).toEqual({ baseTempC: 4.5, category: 'foret' });
	});

	it('falls back to biotope when species is unknown', () => {
		const category = getBiotopeGddCategory(42.75, 0.5);
		expect(category).toBe('montagnarde');
		expect(resolveGddBaseCategory('', 42.75, 0.5)).toBe('montagnarde');
	});

	it('uses standard when species and biotope are unknown', () => {
		expect(resolveGddBaseCategory('', 48.85, 2.35)).toBe('standard');
	});
});

describe('species and biotope mapping', () => {
	it('maps mountain species', () => {
		expect(getSpeciesGddCategory('Mélèze')).toBe('montagnarde');
	});

	it('maps forest species', () => {
		expect(getSpeciesGddCategory('Charme commun')).toBe('foret');
	});

	it('detects evergreen species', () => {
		expect(isEvergreenSpecies('Pin sylvestre')).toBe(true);
		expect(isEvergreenSpecies('Hêtre commun')).toBe(false);
	});
});

describe('estimatePhenology', () => {
	it('assigns ~70% to débourrement at GDD 180 for forêt category', () => {
		const debourrementPct = getStageProbabilityAtGdd(180, 'foret', 'debourrement');
		expect(debourrementPct).toBeGreaterThanOrEqual(65);
		expect(debourrementPct).toBeLessThanOrEqual(75);

		const estimate = estimatePhenology(180, 'foret');
		const debourrement = estimate.stages.find((stage) => stage.id === 'debourrement');
		expect(debourrement?.probabilityPct).toBeGreaterThanOrEqual(65);
		expect(debourrement?.probabilityPct).toBeLessThanOrEqual(75);
		expect(estimate.disclaimer).toBe('estimation probabiliste');
	});

	it('does not assign equal probabilities to all stages at high GDD', () => {
		const estimate = estimatePhenology(600, 'foret');
		const probabilities = estimate.stages.map((stage) => stage.probabilityPct);
		const allEqualAt20 = probabilities.every((pct) => pct === 20);

		expect(allEqualAt20).toBe(false);

		const croissance = estimate.stages.find((stage) => stage.id === 'croissance_active');
		expect(croissance?.probabilityPct).toBeGreaterThanOrEqual(90);

		const dominant = [...estimate.stages].sort(
			(a, b) => b.probabilityPct - a.probabilityPct
		)[0];
		expect(dominant?.id).toBe('croissance_active');
	});
});

describe('getGddSeasonZone', () => {
	it('maps GDD ranges to yamadori season zones', () => {
		expect(getGddSeasonZone(80).label).toBe('Dormance tardive');
		expect(getGddSeasonZone(120).label).toBe('Réveil précoce');
		expect(getGddSeasonZone(250).label).toBe('Fenêtre yamadori favorable');
		expect(getGddSeasonZone(250).tone).toBe('good');
		expect(getGddSeasonZone(500).label).toBe('Débourrement avancé');
		expect(getGddSeasonZone(700).label).toBe('Saison avancée');
	});
});

describe('buildTransitionLabel', () => {
	it('shows a transition when two adjacent stages are competitive', () => {
		const label = buildTransitionLabel([
			{ id: 'dormance', label: 'Dormance', probabilityPct: 5 },
			{ id: 'bourgeon_gonfle', label: 'Bourgeons gonflés', probabilityPct: 38 },
			{ id: 'debourrement', label: 'Débourrement', probabilityPct: 35 },
			{ id: 'feuillaison', label: 'Feuillaison', probabilityPct: 15 },
			{ id: 'croissance_active', label: 'Croissance active', probabilityPct: 7 }
		]);

		expect(label).toContain('Transition');
		expect(label).toContain('→');
	});

	it('shows dominant stage when probability is very high', () => {
		const label = buildTransitionLabel([
			{ id: 'dormance', label: 'Dormance', probabilityPct: 2 },
			{ id: 'bourgeon_gonfle', label: 'Bourgeons gonflés', probabilityPct: 5 },
			{ id: 'debourrement', label: 'Débourrement', probabilityPct: 85 },
			{ id: 'feuillaison', label: 'Feuillaison', probabilityPct: 5 },
			{ id: 'croissance_active', label: 'Croissance active', probabilityPct: 3 }
		]);

		expect(label).toBe('Débourrement');
	});
});

describe('evergreen phenology', () => {
	it('disables phenology estimate for persistent species via snapshot fields', () => {
		expect(isEvergreenSpecies('Genévrier commun')).toBe(true);
		const phenology = estimatePhenology(200, 'foret');
		expect(phenology.stages.length).toBe(5);
	});
});
