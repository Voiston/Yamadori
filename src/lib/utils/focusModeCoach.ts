export const FOCUS_MODE_COACH_KEY = 'yamadori-focus-mode-coach-seen';
export const FOCUS_MODE_TOGGLE_SELECTOR = '[data-focus-mode-toggle]';

export type FocusModeCoachStep = 'toggle' | 'yrs';

export type FocusModeCoachInput = {
	treesReady: boolean;
	treeCount: number;
	onboardingDone: boolean;
	tutorialActive: boolean;
	simpleMode: boolean;
	seen: boolean;
};

export function shouldShowFocusModeCoach(input: FocusModeCoachInput): boolean {
	return (
		input.treesReady &&
		input.treeCount === 1 &&
		input.onboardingDone &&
		!input.tutorialActive &&
		input.simpleMode &&
		!input.seen
	);
}

/** After analysis panels are revealed, the coach highlights YRS. */
export function nextFocusModeCoachStep(current: FocusModeCoachStep): FocusModeCoachStep {
	return current === 'toggle' ? 'yrs' : current;
}

export function hasSeenFocusModeCoach(): boolean {
	if (typeof localStorage === 'undefined') {
		return true;
	}
	try {
		return localStorage.getItem(FOCUS_MODE_COACH_KEY) === '1';
	} catch {
		return true;
	}
}

export function markFocusModeCoachSeen(): void {
	try {
		localStorage.setItem(FOCUS_MODE_COACH_KEY, '1');
	} catch {
		/* ignore quota / private mode */
	}
}
