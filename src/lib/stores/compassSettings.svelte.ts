import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'yamadori-compass-settings';

export type CompassGpsProfile = 'watch' | 'proximity';

type StoredCompassSettings = {
	gpsProfile: CompassGpsProfile;
};

const DEFAULT_SETTINGS: StoredCompassSettings = {
	gpsProfile: 'watch'
};

export const compassSettingsState = $state({
	loaded: false,
	gpsProfile: DEFAULT_SETTINGS.gpsProfile as CompassGpsProfile
});

function applySettings(settings: StoredCompassSettings): void {
	compassSettingsState.gpsProfile = settings.gpsProfile;
}

export async function initCompassSettings(): Promise<void> {
	try {
		const stored = await get<Partial<StoredCompassSettings>>(STORAGE_KEY);
		if (stored) {
			applySettings({ ...DEFAULT_SETTINGS, ...stored });
		}
	} catch {
		applySettings(DEFAULT_SETTINGS);
	} finally {
		compassSettingsState.loaded = true;
	}
}

export async function setCompassGpsProfile(profile: CompassGpsProfile): Promise<void> {
	const { disablePowerSavingMode, powerSavingModeState } = await import(
		'$lib/stores/powerSavingMode.svelte'
	);
	if (powerSavingModeState.active) {
		await disablePowerSavingMode();
	}
	compassSettingsState.gpsProfile = profile;
	await set(STORAGE_KEY, { gpsProfile: profile } satisfies StoredCompassSettings);
}

export { DEFAULT_SETTINGS as DEFAULT_COMPASS_SETTINGS };
