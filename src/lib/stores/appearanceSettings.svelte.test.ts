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

import { get, set } from 'idb-keyval';
import {
	appearanceSettingsState,
	initAppearanceSettings,
	restoreAppearanceSettings
} from './appearanceSettings.svelte';

describe('initAppearanceSettings', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		appearanceSettingsState.loaded = false;
		appearanceSettingsState.locale = 'fr';
		appearanceSettingsState.outdoorMode = false;
		appearanceSettingsState.darkMode = false;
		appearanceSettingsState.simpleMode = false;
	});

	it('applies and persists focus mode when no settings are stored', async () => {
		vi.mocked(get).mockResolvedValue(undefined);

		await initAppearanceSettings();

		expect(appearanceSettingsState.simpleMode).toBe(true);
		expect(set).toHaveBeenCalledWith(
			'yamadori-appearance-settings',
			expect.objectContaining({ simpleMode: true })
		);
	});

	it('keeps persisted simpleMode false for existing installs', async () => {
		vi.mocked(get).mockResolvedValue({
			outdoorMode: false,
			darkMode: false,
			simpleMode: false,
			locale: 'fr'
		});

		await initAppearanceSettings();

		expect(appearanceSettingsState.simpleMode).toBe(false);
	});
});

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
