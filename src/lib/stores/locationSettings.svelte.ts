import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'yamadori-location-settings';

type StoredLocationSettings = {
	backgroundTrackingEnabled: boolean;
};

const DEFAULT_SETTINGS: StoredLocationSettings = {
	backgroundTrackingEnabled: false
};

export const locationSettingsState = $state({
	loaded: false,
	backgroundTrackingEnabled: false
});

export async function initLocationSettings(): Promise<void> {
	try {
		const stored = await get<StoredLocationSettings>(STORAGE_KEY);
		if (stored) {
			locationSettingsState.backgroundTrackingEnabled = stored.backgroundTrackingEnabled;
		}
	} catch {
		locationSettingsState.backgroundTrackingEnabled = DEFAULT_SETTINGS.backgroundTrackingEnabled;
	} finally {
		locationSettingsState.loaded = true;
	}
}

export async function setBackgroundTrackingEnabled(enabled: boolean): Promise<void> {
	locationSettingsState.backgroundTrackingEnabled = enabled;
	await set(STORAGE_KEY, {
		backgroundTrackingEnabled: enabled
	} satisfies StoredLocationSettings);
}

export async function restoreLocationSettings(settings: {
	backgroundTrackingEnabled: boolean;
}): Promise<void> {
	await setBackgroundTrackingEnabled(settings.backgroundTrackingEnabled);
}
