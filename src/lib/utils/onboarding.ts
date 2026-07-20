import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '$lib/utils/platform';

const ONBOARDING_KEY = 'onboardingComplete';
const ONBOARDING_PHASE_KEY = 'onboardingPhase';

export type OnboardingPhase = 'permissions' | 'capture' | 'protection' | 'done';

const VALID_PHASES = new Set<OnboardingPhase>(['permissions', 'capture', 'protection', 'done']);

function isOnboardingPhase(value: string | null | undefined): value is OnboardingPhase {
	return value !== null && value !== undefined && VALID_PHASES.has(value as OnboardingPhase);
}

export async function getOnboardingPhase(): Promise<OnboardingPhase> {
	if (!isNativeApp()) {
		return 'done';
	}

	const { value: phase } = await Preferences.get({ key: ONBOARDING_PHASE_KEY });
	if (isOnboardingPhase(phase)) {
		return phase;
	}

	const { value: legacy } = await Preferences.get({ key: ONBOARDING_KEY });
	if (legacy === 'true') {
		return 'done';
	}

	return 'permissions';
}

export async function setOnboardingPhase(phase: OnboardingPhase): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.set({ key: ONBOARDING_PHASE_KEY, value: phase });
	if (phase === 'done') {
		await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
	}
}

export async function isOnboardingComplete(): Promise<boolean> {
	return (await getOnboardingPhase()) === 'done';
}

export async function setOnboardingComplete(): Promise<void> {
	await setOnboardingPhase('done');
}

export async function resetOnboarding(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.remove({ key: ONBOARDING_KEY });
	await Preferences.remove({ key: ONBOARDING_PHASE_KEY });
}
