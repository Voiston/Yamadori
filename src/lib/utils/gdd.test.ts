import { describe, expect, it } from 'vitest';
import {
	getBiotopeGddCategory,
	getGddSeasonZone,
	getSpeciesGddCategory,
	isEvergreenSpecies,
	isPinusSpecies,
	resolveGddBaseCategory,
	resolveGddBaseTemp
} from '$lib/constants/gdd-config';
import { getPhenologyObservedOptions } from '$lib/constants/assessment';
import {
	buildGddDailySeries,
	buildTransitionLabel,
	computeDailyGdd,
	computeGddLast7dSum,
	estimatePhenology,
	getStageProbabilityAtGdd,
	mergeDailyMeanTemps,
	projectGddSnapshotForward
} from '$lib/utils/gdd';

describe('projectGddSnapshotForward', () => {
	it('adds forecast daily GDD after fromDate through throughDate', () => {
		const base = {
			baseTempC: 4.5,
			baseCategory: 'foret' as const,
			cumulativeSinceJan1: 100,
			last7dSum: 10,
			dailySeries: [],
			phenology: estimatePhenology(100, 'foret'),
			phenologyUnavailableReason: null,
			speciesLabel: 'Hêtre commun'
		};
		const projected = projectGddSnapshotForward(
			base,
			[
				{ date: '2026-06-22', meanTempC: 14.5 },
				{ date: '2026-06-23', meanTempC: 14.5 },
				{ date: '2026-06-24', meanTempC: 14.5 }
			],
			'2026-06-22',
			'2026-06-24'
		);
		// Two days × (14.5 - 4.5) = 20
		expect(projected.cumulativeSinceJan1).toBe(120);
		expect(projected.phenology).not.toBeNull();
	});

	it('skips phenology refresh when requested', () => {
		const phenology = estimatePhenology(100, 'foret');
		const base = {
			baseTempC: 4.5,
			baseCategory: 'foret' as const,
			cumulativeSinceJan1: 100,
			last7dSum: 10,
			dailySeries: [],
			phenology,
			phenologyUnavailableReason: null,
			speciesLabel: null
		};
		const projected = projectGddSnapshotForward(
			base,
			[{ date: '2026-06-23', meanTempC: 20 }],
			'2026-06-22',
			'2026-06-23',
			{ refreshPhenology: false }
		);
		expect(projected.phenology).toBe(phenology);
		expect(projected.cumulativeSinceJan1).toBe(115.5);
	});

	it('drops logistic phenology when the projected day is in late season', () => {
		const base = {
			baseTempC: 4.5,
			baseCategory: 'foret' as const,
			cumulativeSinceJan1: 600,
			last7dSum: 10,
			dailySeries: [],
			phenology: estimatePhenology(600, 'foret'),
			phenologyUnavailableReason: null,
			speciesLabel: 'Hêtre commun'
		};
		const projected = projectGddSnapshotForward(
			base,
			[{ date: '2026-10-16', meanTempC: 14 }],
			'2026-10-15',
			'2026-10-16',
			{ latitude: 47.5 }
		);
		expect(projected.phenology).toBeNull();
		expect(projected.phenologyUnavailableCode).toBe('late_season');

		const july = projectGddSnapshotForward(
			base,
			[{ date: '2026-07-16', meanTempC: 20 }],
			'2026-07-15',
			'2026-07-16',
			{ latitude: 47.5 }
		);
		expect(july.phenology).not.toBeNull();
		expect(july.phenologyUnavailableCode ?? null).toBeNull();
	});
});

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
			referenceDate,
			47.5
		);

		expect(series).toHaveLength(3);
		expect(series[0]).toMatchObject({ date: '2026-01-01', dailyGdd: 1.5, cumulativeGdd: 1.5 });
		expect(series[1]).toMatchObject({ dailyGdd: 3.5, cumulativeGdd: 5 });
		expect(series[2]).toMatchObject({ dailyGdd: 0, cumulativeGdd: 5 });
	});

	it('accumulates GDD since July 1st in the southern hemisphere', () => {
		const referenceDate = new Date('2026-08-05T12:00:00');
		const series = buildGddDailySeries(
			[
				{ date: '2026-06-30', meanTempC: 10 },
				{ date: '2026-07-01', meanTempC: 6 },
				{ date: '2026-07-02', meanTempC: 8 },
				{ date: '2026-08-05', meanTempC: 5 }
			],
			4.5,
			referenceDate,
			-33.87
		);

		expect(series.map((point) => point.date)).toEqual([
			'2026-07-01',
			'2026-07-02',
			'2026-08-05'
		]);
		expect(series[0]).toMatchObject({ dailyGdd: 1.5, cumulativeGdd: 1.5 });
		expect(series.at(-1)?.cumulativeGdd).toBe(5.5);
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

	it('maps international montane and forest biotopes', () => {
		expect(getBiotopeGddCategory(39.5, -106.0)).toBe('montagnarde'); // Rockies
		expect(getBiotopeGddCategory(-42.8, 147.3)).toBe('montagnarde'); // Tasmania
		expect(getBiotopeGddCategory(45.5, -122.7)).toBe('foret'); // PNW
		expect(getBiotopeGddCategory(-45.0, 168.0)).toBe('montagnarde'); // Otago / Fiordland
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
		expect(isEvergreenSpecies('Chêne vert')).toBe(true);
		expect(isEvergreenSpecies('Coast live oak')).toBe(true);
		expect(isPinusSpecies('Pin sylvestre')).toBe(true);
		expect(isPinusSpecies('Pinus sylvestris')).toBe(true);
		expect(isPinusSpecies('Genévrier commun')).toBe(false);
		expect(isPinusSpecies('Olivier')).toBe(false);
	});

	it('offers candle stages only to pines and hides leaf-out on evergreens', () => {
		const pine = getPhenologyObservedOptions('Pin sylvestre').map((option) => option.value);
		const juniper = getPhenologyObservedOptions('Genévrier commun').map((option) => option.value);
		const beech = getPhenologyObservedOptions('Hêtre commun').map((option) => option.value);

		expect(pine).toContain('chandelle');
		expect(pine).toContain('pinceau');
		expect(pine).not.toContain('feuillaison');
		expect(pine).not.toContain('pointe_verte');
		expect(juniper).not.toContain('chandelle');
		expect(juniper).not.toContain('pinceau');
		expect(juniper).not.toContain('feuillaison');
		expect(juniper).toContain('dormance');
		expect(juniper).toContain('bourgeon_gonfle');
		expect(juniper).toContain('debourrement');
		expect(juniper).toContain('croissance_active');
		expect(beech).toContain('feuillaison');
		expect(beech).toContain('pointe_verte');
		expect(beech).not.toContain('chandelle');
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
	it('maps GDD ranges to yamadori season zones (standard category)', () => {
		expect(getGddSeasonZone(79).label).toBe('Dormance tardive');
		expect(getGddSeasonZone(120).label).toBe('Réveil précoce');
		expect(getGddSeasonZone(250).label).toBe('Fenêtre yamadori favorable');
		expect(getGddSeasonZone(250).tone).toBe('good');
		expect(getGddSeasonZone(500).label).toBe('Débourrement avancé');
		expect(getGddSeasonZone(700).label).toBe('Saison avancée');
	});

	it('uses earlier favorable windows for montagnarde category', () => {
		expect(getGddSeasonZone(100, 'montagnarde').tone).toBe('good');
		expect(getGddSeasonZone(100, 'standard').tone).toBe('muted');
	});

	it('labels an out-of-window cumulative as late season when that concession applies', () => {
		const pinWindow = { earlyMin: 50, optimalMin: 100, optimalMax: 450, lateMax: 650 };
		expect(getGddSeasonZone(420, 'montagnarde').label).toBe('Saison avancée');
		expect(getGddSeasonZone(420, 'montagnarde', { window: pinWindow }).tone).toBe('good');
		expect(getGddSeasonZone(30, 'standard', { lateSeason: true }).label).toBe('Saison avancée');
		expect(getGddSeasonZone(30, 'standard').label).toBe('Dormance tardive');
	});
});

describe('buildTransitionLabel', () => {
	it('shows a transition when two adjacent stages are competitive', () => {
		const label = buildTransitionLabel([
			{ id: 'dormance', label: 'Dormance', probabilityPct: 5 },
			{ id: 'bourgeon_gonfle', label: 'Bourgeons gonflés', probabilityPct: 38 },
			{ id: 'pointe_verte', label: 'Pointe verte', probabilityPct: 35 },
			{ id: 'debourrement', label: 'Débourrement', probabilityPct: 15 },
			{ id: 'feuillaison', label: 'Feuillaison', probabilityPct: 5 },
			{ id: 'croissance_active', label: 'Croissance active', probabilityPct: 2 }
		]);

		expect(label).toContain('Transition');
		expect(label).toContain('→');
	});

	it('shows dominant stage when probability is very high', () => {
		const label = buildTransitionLabel([
			{ id: 'dormance', label: 'Dormance', probabilityPct: 2 },
			{ id: 'bourgeon_gonfle', label: 'Bourgeons gonflés', probabilityPct: 5 },
			{ id: 'pointe_verte', label: 'Pointe verte', probabilityPct: 3 },
			{ id: 'debourrement', label: 'Débourrement', probabilityPct: 85 },
			{ id: 'feuillaison', label: 'Feuillaison', probabilityPct: 5 },
			{ id: 'croissance_active', label: 'Croissance active', probabilityPct: 0 }
		]);

		expect(label).toBe('Débourrement');
	});
});

describe('evergreen phenology', () => {
	it('disables phenology estimate for persistent species via snapshot fields', () => {
		expect(isEvergreenSpecies('Genévrier commun')).toBe(true);
		const phenology = estimatePhenology(200, 'foret');
		expect(phenology.stages.length).toBe(6);
	});
});
