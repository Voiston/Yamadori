import { YamadoriBackup } from '$lib/utils/archive/yamadoriBackupPlugin';
import { isAndroidApp } from '$lib/utils/platform';

let cachedDevToggleAvailable: boolean | null = null;

export async function isDevProToggleAvailable(): Promise<boolean> {
	if (!isAndroidApp()) {
		return false;
	}

	if (cachedDevToggleAvailable !== null) {
		return cachedDevToggleAvailable;
	}

	try {
		const { debug } = await YamadoriBackup.getAppBuildInfo();
		cachedDevToggleAvailable = debug;
	} catch {
		cachedDevToggleAvailable = false;
	}

	return cachedDevToggleAvailable;
}

/** Test helper */
export function resetDevBuildCacheForTests(): void {
	cachedDevToggleAvailable = null;
}
