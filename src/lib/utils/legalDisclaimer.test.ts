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
	LEGAL_DISCLAIMER_VERSION,
	acceptLegalDisclaimer,
	clearLegalDisclaimerAck,
	hasAcceptedCurrentLegalDisclaimer
} from './legalDisclaimer';

describe('legalDisclaimer', () => {
	beforeEach(() => {
		mockPreferencesGet.mockReset();
		mockPreferencesSet.mockReset();
		mockPreferencesRemove.mockReset();
		mockPreferencesSet.mockResolvedValue(undefined);
		mockPreferencesRemove.mockResolvedValue(undefined);
	});

	it('returns false when no version is stored', async () => {
		mockPreferencesGet.mockResolvedValue({ value: null });
		await expect(hasAcceptedCurrentLegalDisclaimer()).resolves.toBe(false);
	});

	it('returns false when stored version is outdated', async () => {
		mockPreferencesGet.mockResolvedValue({ value: String(LEGAL_DISCLAIMER_VERSION - 1) });
		await expect(hasAcceptedCurrentLegalDisclaimer()).resolves.toBe(false);
	});

	it('returns true when stored version matches current', async () => {
		mockPreferencesGet.mockResolvedValue({ value: String(LEGAL_DISCLAIMER_VERSION) });
		await expect(hasAcceptedCurrentLegalDisclaimer()).resolves.toBe(true);
	});

	it('persists version and acceptedAt on accept', async () => {
		const stored = new Map<string, string>();
		mockPreferencesSet.mockImplementation(async ({ key, value }: { key: string; value: string }) => {
			stored.set(key, value);
		});
		mockPreferencesGet.mockImplementation(async ({ key }: { key: string }) => ({
			value: stored.get(key) ?? null
		}));

		await acceptLegalDisclaimer();

		expect(stored.get('legalDisclaimerVersion')).toBe(String(LEGAL_DISCLAIMER_VERSION));
		expect(stored.get('legalDisclaimerAcceptedAt')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		await expect(hasAcceptedCurrentLegalDisclaimer()).resolves.toBe(true);
	});

	it('clears both preference keys', async () => {
		await clearLegalDisclaimerAck();
		expect(mockPreferencesRemove).toHaveBeenCalledWith({ key: 'legalDisclaimerVersion' });
		expect(mockPreferencesRemove).toHaveBeenCalledWith({ key: 'legalDisclaimerAcceptedAt' });
	});
});
