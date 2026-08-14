export type MapOnboardingStepId = 'menu' | 'layers' | 'tap' | 'tips';

export type MapOnboardingLayersVariant = 'both' | 'cadastre' | 'protected';

export type MapOnboardingCaps = {
	hasCadastreOverlay: boolean;
	hasProtectedOverlay: boolean;
	/** full | partial | none from getGeoCapabilities */
	cadastreLevel: 'full' | 'partial' | 'none';
};

/**
 * Build the country-aware onboarding pipeline (frozen for one tutorial session).
 * Max 4 steps: menu → layers? → tap? → tips.
 */
export function buildMapOnboardingSteps(caps: MapOnboardingCaps): MapOnboardingStepId[] {
	const steps: MapOnboardingStepId[] = ['menu'];

	if (caps.hasCadastreOverlay || caps.hasProtectedOverlay) {
		steps.push('layers');
	}

	if (caps.cadastreLevel !== 'none') {
		steps.push('tap');
	}

	steps.push('tips');
	return steps;
}

export function resolveMapOnboardingLayersVariant(
	caps: MapOnboardingCaps
): MapOnboardingLayersVariant {
	if (caps.hasCadastreOverlay && caps.hasProtectedOverlay) return 'both';
	if (caps.hasCadastreOverlay) return 'cadastre';
	return 'protected';
}
