import {
	getOnboardingPhase,
	setOnboardingPhase,
	resetOnboarding as resetOnboardingPrefs,
	type OnboardingPhase
} from '$lib/utils/onboarding';
import { isNativeApp } from '$lib/utils/platform';

export const onboardingState = $state({
	loaded: false,
	phase: 'done' as OnboardingPhase,
	captureSavedTree: false
});

export async function initOnboarding(): Promise<void> {
	if (!isNativeApp()) {
		onboardingState.phase = 'done';
		onboardingState.loaded = true;
		return;
	}

	onboardingState.phase = await getOnboardingPhase();
	onboardingState.loaded = true;
}

export async function advanceOnboardingPhase(phase: OnboardingPhase): Promise<void> {
	await setOnboardingPhase(phase);
	onboardingState.phase = phase;
}

export function setCaptureSavedDuringTutorial(saved: boolean): void {
	onboardingState.captureSavedTree = saved;
}

export async function resetOnboardingFlow(): Promise<void> {
	await resetOnboardingPrefs();
	onboardingState.phase = 'permissions';
	onboardingState.captureSavedTree = false;
}
