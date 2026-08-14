import { Preferences } from '@capacitor/preferences';
import { isDevProToggleAvailable } from '$lib/utils/devBuild';

const STORAGE_KEY = 'yamadori-dev-pro-override';

export const devProOverrideState = $state({
	loaded: false,
	available: false,
	enabled: false
});

export async function initDevProOverride(): Promise<void> {
	devProOverrideState.available = await isDevProToggleAvailable();

	if (devProOverrideState.available) {
		try {
			const { value } = await Preferences.get({ key: STORAGE_KEY });
			devProOverrideState.enabled = value === 'true';
		} catch {
			devProOverrideState.enabled = false;
		}
	} else {
		devProOverrideState.enabled = false;
	}

	devProOverrideState.loaded = true;
}

export async function setDevProOverride(enabled: boolean): Promise<void> {
	if (!devProOverrideState.available) {
		return;
	}

	devProOverrideState.enabled = enabled;
	await Preferences.set({ key: STORAGE_KEY, value: enabled ? 'true' : 'false' });
}
