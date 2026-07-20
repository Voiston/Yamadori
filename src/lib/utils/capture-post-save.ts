import type { OnboardingPhase } from '$lib/utils/onboarding';

export type PostCaptureSaveDeps = {
	phase: OnboardingPhase;
	advanceToProtection: () => Promise<void>;
	markCaptureSavedDuringTutorial: () => void;
	goHome: () => Promise<void>;
};

export async function handlePostCaptureSaveNavigation(deps: PostCaptureSaveDeps): Promise<void> {
	if (deps.phase === 'capture') {
		deps.markCaptureSavedDuringTutorial();
		await deps.advanceToProtection();
		return;
	}
	await deps.goHome();
}
