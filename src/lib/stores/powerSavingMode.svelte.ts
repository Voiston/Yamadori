import { get, set } from 'idb-keyval';
import {
	appearanceSettingsState,
	setDarkMode,
	setOutdoorMode
} from '$lib/stores/appearanceSettings.svelte';
import {
	compassSettingsState,
	setCompassGpsProfile,
	type CompassGpsProfile
} from '$lib/stores/compassSettings.svelte';

const STORAGE_KEY = 'yamadori-power-saving-mode';

type SavedAppearance = {
	darkMode: boolean;
	outdoorMode: boolean;
};

type SavedPowerSaving = {
	compassGpsProfile: CompassGpsProfile;
	appearance: SavedAppearance | null;
};

type StoredPowerSavingMode = {
	enabled: boolean;
};

export const powerSavingModeState = $state({
	loaded: false,
	active: false,
	saved: null as SavedPowerSaving | null
});

async function persistPowerSavingPreference(enabled: boolean): Promise<void> {
	await set(STORAGE_KEY, { enabled } satisfies StoredPowerSavingMode);
}

async function resyncGpsAfterPowerSavingChange(): Promise<void> {
	const { resyncLocationWatchAfterPowerSavingChange } = await import(
		'$lib/utils/userPosition.svelte'
	);
	await resyncLocationWatchAfterPowerSavingChange();
}

export async function enablePowerSavingMode(): Promise<void> {
	if (powerSavingModeState.active) {
		return;
	}

	powerSavingModeState.saved = {
		compassGpsProfile: compassSettingsState.gpsProfile,
		appearance: {
			darkMode: appearanceSettingsState.darkMode,
			outdoorMode: appearanceSettingsState.outdoorMode
		}
	};

	if (appearanceSettingsState.outdoorMode) {
		await setOutdoorMode(false);
	}

	await setCompassGpsProfile('proximity');
	await setDarkMode(true);

	powerSavingModeState.active = true;
	await persistPowerSavingPreference(true);
	await resyncGpsAfterPowerSavingChange();
}

export async function disablePowerSavingMode(): Promise<void> {
	const saved = powerSavingModeState.saved;
	powerSavingModeState.active = false;
	powerSavingModeState.saved = null;

	if (!saved) {
		await persistPowerSavingPreference(false);
		return;
	}

	await setCompassGpsProfile(saved.compassGpsProfile);

	if (saved.appearance) {
		if (saved.appearance.outdoorMode) {
			await setOutdoorMode(true);
		} else {
			await setDarkMode(saved.appearance.darkMode);
		}
	}

	await persistPowerSavingPreference(false);
	await resyncGpsAfterPowerSavingChange();
}

export async function setPowerSavingMode(enabled: boolean): Promise<void> {
	if (enabled) {
		await enablePowerSavingMode();
		return;
	}
	await disablePowerSavingMode();
}

export async function togglePowerSavingMode(): Promise<void> {
	await setPowerSavingMode(!powerSavingModeState.active);
}

export async function initPowerSavingMode(): Promise<void> {
	try {
		const stored = await get<StoredPowerSavingMode>(STORAGE_KEY);
		if (stored?.enabled) {
			await enablePowerSavingMode();
		}
	} catch {
		powerSavingModeState.active = false;
		powerSavingModeState.saved = null;
	} finally {
		powerSavingModeState.loaded = true;
	}
}
