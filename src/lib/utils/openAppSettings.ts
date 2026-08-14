import { AndroidSettingsPage, SettingsLauncher } from '@capawesome/capacitor-settings-launcher';
import { isAndroidApp, isNativeApp } from '$lib/utils/platform';

/** Opens the app's settings screen (permission toggles). No-op on web. */
export async function openAppSettings(): Promise<boolean> {
	if (!isNativeApp()) {
		return false;
	}

	try {
		await SettingsLauncher.openAppSettings();
		return true;
	} catch (error) {
		console.warn('openAppSettings failed:', error);
		return false;
	}
}

/** Opens Android system location settings (GPS on/off). No-op outside Android. */
export async function openLocationSettings(): Promise<boolean> {
	if (!isAndroidApp()) {
		return false;
	}

	try {
		await SettingsLauncher.openAndroidSettings({ page: AndroidSettingsPage.Location });
		return true;
	} catch (error) {
		console.warn('openLocationSettings failed:', error);
		return false;
	}
}
