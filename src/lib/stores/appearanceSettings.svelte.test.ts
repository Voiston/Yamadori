import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRefreshLocationLabelsForUiLocale = vi.fn();

vi.mock('idb-keyval', () => ({
	get: vi.fn().mockResolvedValue(undefined),
	set: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/paraglide/runtime.js', () => ({
	setLocale: vi.fn(),
	locales: ['fr', 'en', 'de']
}));

vi.mock('$lib/utils/refreshLocationLabels', () => ({
	refreshLocationLabelsForUiLocale: (...args: unknown[]) =>
		mockRefreshLocationLabelsForUiLocale(...args)
}));

import {
	appearanceSettingsState,
	restoreAppearanceSettings
} from './appearanceSettings.svelte';

describe('restoreAppearanceSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appearanceSettingsState.loaded = true;
		appearanceSettingsState.locale = 'fr';
		appearanceSettingsState.outdoorMode = false;
		appearanceSettingsState.darkMode = false;
		appearanceSettingsState.simpleMode = false;
	});

	it('refreshes location labels by default when locale is restored', async () => {
		await restoreAppearanceSettings({
			outdoorMode: false,
			locale: 'en'
		});

		expect(appearanceSettingsState.locale).toBe('en');
		await vi.waitFor(() => {
			expect(mockRefreshLocationLabelsForUiLocale).toHaveBeenCalledWith('en');
		});
	});

	it('skips label refresh when skipLabelRefresh is set (import path)', async () => {
		await restoreAppearanceSettings(
			{
				outdoorMode: false,
				locale: 'en'
			},
			{ skipLabelRefresh: true }
		);

		expect(appearanceSettingsState.locale).toBe('en');
		await Promise.resolve();
		await Promise.resolve();
		expect(mockRefreshLocationLabelsForUiLocale).not.toHaveBeenCalled();
	});
});
