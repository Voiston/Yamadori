import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	FOCUS_MODE_COACH_KEY,
	hasSeenFocusModeCoach,
	markFocusModeCoachSeen,
	nextFocusModeCoachStep,
	shouldShowFocusModeCoach,
	type FocusModeCoachInput
} from './focusModeCoach';

const eligible: FocusModeCoachInput = {
	treesReady: true,
	treeCount: 1,
	onboardingDone: true,
	tutorialActive: false,
	simpleMode: true,
	seen: false
};

describe('shouldShowFocusModeCoach', () => {
	it('shows on the second capture when focus is on and the coach is unseen', () => {
		expect(shouldShowFocusModeCoach(eligible)).toBe(true);
	});

	it('hides when trees are not ready', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, treesReady: false })).toBe(false);
	});

	it('hides on the first capture (no tree yet)', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, treeCount: 0 })).toBe(false);
	});

	it('hides when the inventory already has more than one tree', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, treeCount: 2 })).toBe(false);
	});

	it('hides during onboarding', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, onboardingDone: false })).toBe(false);
	});

	it('hides during the first-tree tutorial', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, tutorialActive: true })).toBe(false);
	});

	it('hides when focus mode is off', () => {
		// Staying mounted after the toggle is a page-level latch (focusCoachActive),
		// not shouldShowFocusModeCoach — eligibility is only for the initial show.
		expect(shouldShowFocusModeCoach({ ...eligible, simpleMode: false })).toBe(false);
	});

	it('hides when already seen', () => {
		expect(shouldShowFocusModeCoach({ ...eligible, seen: true })).toBe(false);
	});
});

describe('nextFocusModeCoachStep', () => {
	it('advances from the toggle step to YRS after panels are revealed', () => {
		expect(nextFocusModeCoachStep('toggle')).toBe('yrs');
	});

	it('stays on YRS once revealed', () => {
		expect(nextFocusModeCoachStep('yrs')).toBe('yrs');
	});
});

describe('focus mode coach persistence', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reads and writes the seen flag in localStorage', () => {
		const store = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => store.get(key) ?? null,
			setItem: (key: string, value: string) => {
				store.set(key, value);
			}
		});

		expect(hasSeenFocusModeCoach()).toBe(false);
		markFocusModeCoachSeen();
		expect(store.get(FOCUS_MODE_COACH_KEY)).toBe('1');
		expect(hasSeenFocusModeCoach()).toBe(true);
	});

	it('treats localStorage failures as already seen', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		});

		expect(hasSeenFocusModeCoach()).toBe(true);
		expect(() => markFocusModeCoachSeen()).not.toThrow();
	});
});
