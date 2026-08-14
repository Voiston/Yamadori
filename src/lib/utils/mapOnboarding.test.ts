import { describe, expect, it } from 'vitest';
import {
	buildMapOnboardingSteps,
	resolveMapOnboardingLayersVariant
} from './mapOnboarding';

describe('buildMapOnboardingSteps', () => {
	it('includes layers+tap for full cadastre with both overlays (FR-like)', () => {
		expect(
			buildMapOnboardingSteps({
				hasCadastreOverlay: true,
				hasProtectedOverlay: true,
				cadastreLevel: 'full'
			})
		).toEqual(['menu', 'layers', 'tap', 'tips']);
	});

	it('uses protected layers + tap for DE-like caps', () => {
		expect(
			buildMapOnboardingSteps({
				hasCadastreOverlay: false,
				hasProtectedOverlay: true,
				cadastreLevel: 'partial'
			})
		).toEqual(['menu', 'layers', 'tap', 'tips']);
		expect(
			resolveMapOnboardingLayersVariant({
				hasCadastreOverlay: false,
				hasProtectedOverlay: true,
				cadastreLevel: 'partial'
			})
		).toBe('protected');
	});

	it('skips layers and tap when neither overlay nor cadastre', () => {
		expect(
			buildMapOnboardingSteps({
				hasCadastreOverlay: false,
				hasProtectedOverlay: false,
				cadastreLevel: 'none'
			})
		).toEqual(['menu', 'tips']);
	});

	it('keeps tap without layers when cadastre API but no overlays', () => {
		expect(
			buildMapOnboardingSteps({
				hasCadastreOverlay: false,
				hasProtectedOverlay: false,
				cadastreLevel: 'partial'
			})
		).toEqual(['menu', 'tap', 'tips']);
	});
});
