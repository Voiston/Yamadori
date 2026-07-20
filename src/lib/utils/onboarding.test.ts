import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPreferencesGet = vi.fn();
const mockPreferencesSet = vi.fn();
const mockPreferencesRemove = vi.fn();

vi.mock('@capacitor/preferences', () => ({
	Preferences: {
		get: (...args: unknown[]) => mockPreferencesGet(...args),
		set: (...args: unknown[]) => mockPreferencesSet(...args),
		remove: (...args: unknown[]) => mockPreferencesRemove(...args)
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: () => true
}));

import {
	getOnboardingPhase,
	isOnboardingComplete,
	resetOnboarding,
	setOnboardingPhase
} from './onboarding';

describe('onboarding phases', () => {
	beforeEach(() => {
		mockPreferencesGet.mockReset();
		mockPreferencesSet.mockReset();
		mockPreferencesRemove.mockReset();
		mockPreferencesSet.mockResolvedValue(undefined);
		mockPreferencesRemove.mockResolvedValue(undefined);
	});

	it('returns permissions when no prefs are stored', async () => {
		mockPreferencesGet.mockResolvedValue({ value: null });
		await expect(getOnboardingPhase()).resolves.toBe('permissions');
	});

	it('migrates legacy onboardingComplete to done', async () => {
		mockPreferencesGet.mockImplementation(async ({ key }: { key: string }) => {
			if (key === 'onboardingPhase') return { value: null };
			if (key === 'onboardingComplete') return { value: 'true' };
			return { value: null };
		});
		await expect(getOnboardingPhase()).resolves.toBe('done');
	});

	it('persists done phase and legacy complete flag', async () => {
		const stored = new Map<string, string>();
		mockPreferencesGet.mockImplementation(async ({ key }: { key: string }) => ({
			value: stored.get(key) ?? null
		}));
		mockPreferencesSet.mockImplementation(async ({ key, value }: { key: string; value: string }) => {
			stored.set(key, value);
		});
		await setOnboardingPhase('done');
		expect(stored.get('onboardingPhase')).toBe('done');
		expect(stored.get('onboardingComplete')).toBe('true');
		await expect(isOnboardingComplete()).resolves.toBe(true);
	});

	it('reset clears both keys', async () => {
		await resetOnboarding();
		expect(mockPreferencesRemove).toHaveBeenCalledWith({ key: 'onboardingComplete' });
		expect(mockPreferencesRemove).toHaveBeenCalledWith({ key: 'onboardingPhase' });
	});
});
