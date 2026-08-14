import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockOpenAppSettings, mockOpenAndroidSettings, mockIsNativeApp, mockIsAndroidApp } =
	vi.hoisted(() => ({
		mockOpenAppSettings: vi.fn(),
		mockOpenAndroidSettings: vi.fn(),
		mockIsNativeApp: vi.fn(),
		mockIsAndroidApp: vi.fn()
	}));

vi.mock('@capawesome/capacitor-settings-launcher', () => ({
	SettingsLauncher: {
		openAppSettings: (...args: unknown[]) => mockOpenAppSettings(...args),
		openAndroidSettings: (...args: unknown[]) => mockOpenAndroidSettings(...args)
	},
	AndroidSettingsPage: {
		Location: 'LOCATION'
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: (...args: unknown[]) => mockIsNativeApp(...args),
	isAndroidApp: (...args: unknown[]) => mockIsAndroidApp(...args)
}));

import { openAppSettings, openLocationSettings } from './openAppSettings';

describe('openAppSettings', () => {
	beforeEach(() => {
		mockOpenAppSettings.mockReset();
		mockOpenAndroidSettings.mockReset();
		mockIsNativeApp.mockReset();
		mockIsAndroidApp.mockReset();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('is a no-op on web', async () => {
		mockIsNativeApp.mockReturnValue(false);
		await expect(openAppSettings()).resolves.toBe(false);
		expect(mockOpenAppSettings).not.toHaveBeenCalled();
	});

	it('opens app settings on native', async () => {
		mockIsNativeApp.mockReturnValue(true);
		mockOpenAppSettings.mockResolvedValue(undefined);
		await expect(openAppSettings()).resolves.toBe(true);
		expect(mockOpenAppSettings).toHaveBeenCalledOnce();
	});

	it('returns false when the native call fails', async () => {
		mockIsNativeApp.mockReturnValue(true);
		mockOpenAppSettings.mockRejectedValue(new Error('unavailable'));
		await expect(openAppSettings()).resolves.toBe(false);
	});
});

describe('openLocationSettings', () => {
	beforeEach(() => {
		mockOpenAppSettings.mockReset();
		mockOpenAndroidSettings.mockReset();
		mockIsNativeApp.mockReset();
		mockIsAndroidApp.mockReset();
	});

	it('is a no-op outside Android', async () => {
		mockIsAndroidApp.mockReturnValue(false);
		await expect(openLocationSettings()).resolves.toBe(false);
		expect(mockOpenAndroidSettings).not.toHaveBeenCalled();
	});

	it('opens Android location settings', async () => {
		mockIsAndroidApp.mockReturnValue(true);
		mockOpenAndroidSettings.mockResolvedValue(undefined);
		await expect(openLocationSettings()).resolves.toBe(true);
		expect(mockOpenAndroidSettings).toHaveBeenCalledWith({ page: 'LOCATION' });
	});
});
