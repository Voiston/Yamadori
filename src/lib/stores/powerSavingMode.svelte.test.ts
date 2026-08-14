import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
	mockResync,
	idbStore,
	appearanceState,
	compassState,
	mockSetDarkMode,
	mockSetOutdoorMode,
	mockSetCompassGpsProfile
} = vi.hoisted(() => {
	const store = new Map<string, unknown>();
	const appearance = {
		outdoorMode: false,
		darkMode: false
	};
	const compass = {
		gpsProfile: 'watch' as 'watch' | 'proximity'
	};

	return {
		mockResync: vi.fn().mockResolvedValue(undefined),
		idbStore: store,
		appearanceState: appearance,
		compassState: compass,
		mockSetDarkMode: vi.fn(async (enabled: boolean) => {
			appearance.darkMode = enabled;
			if (enabled) {
				appearance.outdoorMode = false;
			}
		}),
		mockSetOutdoorMode: vi.fn(async (enabled: boolean) => {
			appearance.outdoorMode = enabled;
			if (enabled) {
				appearance.darkMode = false;
			}
		}),
		mockSetCompassGpsProfile: vi.fn(async (profile: 'watch' | 'proximity') => {
			compass.gpsProfile = profile;
		})
	};
});

vi.mock('idb-keyval', () => ({
	get: vi.fn(async (key: string) => idbStore.get(key)),
	set: vi.fn(async (key: string, value: unknown) => {
		idbStore.set(key, value);
	})
}));

vi.mock('$lib/utils/userPosition.svelte', () => ({
	resyncLocationWatchAfterPowerSavingChange: (...args: unknown[]) => mockResync(...args)
}));

vi.mock('$lib/stores/appearanceSettings.svelte', () => ({
	appearanceSettingsState: appearanceState,
	setDarkMode: (...args: unknown[]) => mockSetDarkMode(...(args as [boolean])),
	setOutdoorMode: (...args: unknown[]) => mockSetOutdoorMode(...(args as [boolean]))
}));

vi.mock('$lib/stores/compassSettings.svelte', () => ({
	compassSettingsState: compassState,
	setCompassGpsProfile: (...args: unknown[]) => mockSetCompassGpsProfile(...(args as ['watch' | 'proximity']))
}));

import {
	disablePowerSavingMode,
	enablePowerSavingMode,
	initPowerSavingMode,
	powerSavingModeState,
	setPowerSavingMode
} from './powerSavingMode.svelte';

function resetPowerSavingState(): void {
	powerSavingModeState.loaded = false;
	powerSavingModeState.active = false;
	powerSavingModeState.saved = null;
}

function applyRealisticSetCompassGpsProfileMock(): void {
	mockSetCompassGpsProfile.mockImplementation(async (profile: 'watch' | 'proximity') => {
		const { disablePowerSavingMode, powerSavingModeState } =
			await import('./powerSavingMode.svelte');
		if (powerSavingModeState.active) {
			await disablePowerSavingMode();
		}
		compassState.gpsProfile = profile;
	});
}

describe('powerSavingMode', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		idbStore.clear();
		resetPowerSavingState();
		appearanceState.outdoorMode = false;
		appearanceState.darkMode = false;
		compassState.gpsProfile = 'watch';
		applyRealisticSetCompassGpsProfileMock();
	});

	afterEach(() => {
		resetPowerSavingState();
	});

	it('enables proximity compass, dark mode, and resyncs GPS', async () => {
		await enablePowerSavingMode();

		expect(powerSavingModeState.active).toBe(true);
		expect(powerSavingModeState.saved?.compassGpsProfile).toBe('watch');
		expect(mockSetCompassGpsProfile).toHaveBeenCalledWith('proximity');
		expect(mockSetDarkMode).toHaveBeenCalledWith(true);
		expect(mockResync).toHaveBeenCalledOnce();
		expect(idbStore.get('yamadori-power-saving-mode')).toEqual({ enabled: true });
	});

	it('restores compass profile and dark mode on disable', async () => {
		appearanceState.darkMode = false;
		compassState.gpsProfile = 'watch';

		await enablePowerSavingMode();
		await disablePowerSavingMode();

		expect(powerSavingModeState.active).toBe(false);
		expect(powerSavingModeState.saved).toBeNull();
		expect(mockSetCompassGpsProfile).toHaveBeenLastCalledWith('watch');
		expect(mockSetDarkMode).toHaveBeenLastCalledWith(false);
		expect(idbStore.get('yamadori-power-saving-mode')).toEqual({ enabled: false });
	});

	it('turns off outdoor mode on enable and restores it on disable', async () => {
		appearanceState.outdoorMode = true;
		appearanceState.darkMode = false;

		await enablePowerSavingMode();

		expect(mockSetOutdoorMode).toHaveBeenCalledWith(false);
		expect(mockSetDarkMode).toHaveBeenCalledWith(true);

		await disablePowerSavingMode();

		expect(mockSetOutdoorMode).toHaveBeenLastCalledWith(true);
	});

	it('setPowerSavingMode toggles through the public API', async () => {
		await setPowerSavingMode(true);
		expect(powerSavingModeState.active).toBe(true);

		await setPowerSavingMode(false);
		expect(powerSavingModeState.active).toBe(false);
	});

	it('disable does not recurse when setCompassGpsProfile mirrors production guard', async () => {
		await enablePowerSavingMode();
		await disablePowerSavingMode();

		expect(powerSavingModeState.active).toBe(false);
		expect(mockSetCompassGpsProfile).toHaveBeenCalledTimes(2);
		expect(mockSetCompassGpsProfile).toHaveBeenNthCalledWith(1, 'proximity');
		expect(mockSetCompassGpsProfile).toHaveBeenNthCalledWith(2, 'watch');
	});

	it('init reapplies power saving when persisted as enabled', async () => {
		idbStore.set('yamadori-power-saving-mode', { enabled: true });

		await initPowerSavingMode();

		expect(powerSavingModeState.loaded).toBe(true);
		expect(powerSavingModeState.active).toBe(true);
		expect(mockSetCompassGpsProfile).toHaveBeenCalledWith('proximity');
	});
});
