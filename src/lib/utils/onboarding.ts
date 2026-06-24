import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '$lib/utils/platform';

const ONBOARDING_KEY = 'onboardingComplete';

export async function isOnboardingComplete(): Promise<boolean> {
	if (!isNativeApp()) {
		return true;
	}

	const { value } = await Preferences.get({ key: ONBOARDING_KEY });
	return value === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
}

export async function resetOnboarding(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	await Preferences.remove({ key: ONBOARDING_KEY });
}
