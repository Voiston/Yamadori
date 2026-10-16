import { describe, expect, it } from 'vitest';
import {
	listProfiledSpeciesNames,
	resolvePhenologyLogisticParams,
	resolveSpeciesGddProfile,
	resolveYrsGddWindowForSpecies
} from '$lib/constants/species-gdd-profiles';
import { YRS_GDD_WINDOWS } from '$lib/constants/gdd-config';
import type { GddBaseCategory, GddPhenologyStageId } from '$lib/types/gdd';
import { estimatePhenology } from '$lib/utils/gdd';

describe('resolveSpeciesGddProfile', () => {
	it('returns Quercus literature profile for sessile oak', () => {
		const profile = resolveSpeciesGddProfile('Chêne sessile');
		expect(profile).not.toBeNull();
		expect(profile!.category).toBe('foret');
		expect(profile!.baseTempC).toBe(5.5);
		expect(profile!.source).toBe('literature');
		expect(profile!.phenologyMidpoints?.debourrement).toBe(210);
	});

	it('returns earlier Betula debourrement than Quercus at same structure', () => {
		const birch = resolveSpeciesGddProfile('Bouleau')!;
		const oak = resolveSpeciesGddProfile('Chêne sessile')!;
		expect(birch.phenologyMidpoints!.debourrement!).toBeLessThan(
			oak.phenologyMidpoints!.debourrement!
		);
		expect(birch.baseTempC).toBeLessThan(oak.baseTempC);
	});

	it('falls back to category defaults for unmapped catalog species', () => {
		const profile = resolveSpeciesGddProfile('Frêne');
		expect(profile).not.toBeNull();
		expect(profile!.category).toBe('foret');
		expect(profile!.source).toBe('editorial');
	});

	it('returns null for unknown species', () => {
		expect(resolveSpeciesGddProfile('Unknown shrub xyz')).toBeNull();
	});
});

describe('resolveYrsGddWindowForSpecies', () => {
	it('uses species window when profiled', () => {
		const window = resolveYrsGddWindowForSpecies('Bouleau', 'foret');
		expect(window.optimalMin).toBeLessThan(YRS_GDD_WINDOWS.foret.optimalMin);
	});

	it('falls back to category window', () => {
		expect(resolveYrsGddWindowForSpecies(undefined, 'standard')).toEqual(
			YRS_GDD_WINDOWS.standard
		);
	});
});

describe('species phenology midpoints', () => {
	it('shifts dominant stage vs category-only at same GDD', () => {
		const gdd = 150;
		const birchParams = resolvePhenologyLogisticParams('foret', 'Bouleau');
		const oakParams = resolvePhenologyLogisticParams('foret', 'Chêne sessile');
		expect(birchParams.debourrement.midpoint).toBeLessThan(oakParams.debourrement.midpoint);

		const birch = estimatePhenology(gdd, 'foret', 'Bouleau');
		const oak = estimatePhenology(gdd, 'foret', 'Chêne sessile');
		const birchDeb = birch.stages.find((s) => s.id === 'debourrement')!.probabilityPct;
		const oakDeb = oak.stages.find((s) => s.id === 'debourrement')!.probabilityPct;
		// Birch reaches budbreak earlier → at GDD 150 birch should be further along
		expect(birchDeb + birch.stages.find((s) => s.id === 'feuillaison')!.probabilityPct).toBeGreaterThanOrEqual(
			oakDeb
		);
	});

	it('keeps every profiled species stage midpoint strictly ordered', () => {
		const stages: GddPhenologyStageId[] = [
			'dormance',
			'bourgeon_gonfle',
			'pointe_verte',
			'debourrement',
			'feuillaison',
			'croissance_active'
		];
		const categories: GddBaseCategory[] = ['montagnarde', 'foret', 'standard'];
		const names = listProfiledSpeciesNames();
		expect(names.length).toBeGreaterThan(0);

		for (const name of names) {
			for (const category of categories) {
				const params = resolvePhenologyLogisticParams(category, name);
				for (let index = 1; index < stages.length; index += 1) {
					const previous = stages[index - 1];
					const current = stages[index];
					expect(
						params[previous].midpoint,
						`${name} / ${category}: ${previous} < ${current}`
					).toBeLessThan(params[current].midpoint);
				}
			}
		}
	});

	it('centers green tip on the species curve, including a standard caller category', () => {
		const sessile = resolvePhenologyLogisticParams('foret', 'Chêne sessile');
		expect(sessile.pointe_verte.midpoint).toBe(155);
		expect(sessile.bourgeon_gonfle.midpoint).toBeLessThan(sessile.pointe_verte.midpoint);
		expect(sessile.pointe_verte.midpoint).toBeLessThan(sessile.debourrement.midpoint);

		const maple = resolvePhenologyLogisticParams('standard', 'Érable sycomore');
		expect(maple.pointe_verte.midpoint).toBe(105);
		expect(maple.pointe_verte.midpoint).toBeLessThan(maple.debourrement.midpoint);
		expect(maple.pointe_verte.steepness).toBe(
			resolvePhenologyLogisticParams('foret', 'Érable sycomore').pointe_verte.steepness
		);
	});

	it('keeps birch green tip inside the probability budget at budbreak', () => {
		for (const species of ['Bouleau', 'Paper birch']) {
			const estimate = estimatePhenology(110, 'foret', species);
			const greenTip = estimate.stages.find((stage) => stage.id === 'pointe_verte');
			const sum = estimate.stages.reduce((total, stage) => total + stage.probabilityPct, 0);
			const dominant = [...estimate.stages].sort((a, b) => b.probabilityPct - a.probabilityPct)[0];

			expect(greenTip?.probabilityPct).toBeGreaterThan(0);
			expect(sum).toBeLessThanOrEqual(101);
			expect(dominant?.id).toBe('debourrement');
		}
	});
});
