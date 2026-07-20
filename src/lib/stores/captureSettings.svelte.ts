import { get, set } from 'idb-keyval';

const STORAGE_KEY = 'yamadori-capture-settings';

type StoredCaptureSettings = {
	terrainModeEnabled: boolean;
};

const DEFAULT_SETTINGS: StoredCaptureSettings = {
	terrainModeEnabled: false
};

export const captureSettingsState = $state({
	loaded: false,
	terrainModeEnabled: DEFAULT_SETTINGS.terrainModeEnabled
});

function applySettings(settings: StoredCaptureSettings): void {
	captureSettingsState.terrainModeEnabled = settings.terrainModeEnabled;
}

export async function initCaptureSettings(): Promise<void> {
	try {
		const stored = await get<Partial<StoredCaptureSettings>>(STORAGE_KEY);
		if (stored) {
			applySettings({ ...DEFAULT_SETTINGS, ...stored });
		}
	} catch {
		applySettings(DEFAULT_SETTINGS);
	} finally {
		captureSettingsState.loaded = true;
	}
}

export async function setTerrainModeEnabled(enabled: boolean): Promise<void> {
	captureSettingsState.terrainModeEnabled = enabled;
	await set(STORAGE_KEY, { terrainModeEnabled: enabled } satisfies StoredCaptureSettings);
}

export { DEFAULT_SETTINGS as DEFAULT_CAPTURE_SETTINGS };
