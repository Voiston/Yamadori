import { describe, expect, it } from 'vitest';
import {
	resolvePhenologyLogisticParams,
	resolveSpeciesGddProfile,
	resolveYrsGddWindowForSpecies
} from '$lib/constants/species-gdd-profiles';
import { YRS_GDD_WINDOWS } from '$lib/constants/gdd-config';
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
});
