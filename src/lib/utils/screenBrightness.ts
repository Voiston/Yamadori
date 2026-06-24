import { isNativeApp } from '$lib/utils/platform';

let savedBrightness: number | null = null;

export async function applyOutdoorScreenBrightness(enabled: boolean): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		const { ScreenBrightness } = await import('@capacitor-community/screen-brightness');

		if (enabled) {
			const current = await ScreenBrightness.getBrightness();
			if (savedBrightness === null) {
				savedBrightness = current.brightness;
			}
			await ScreenBrightness.setBrightness({ brightness: 1 });
			return;
		}

		if (savedBrightness !== null && savedBrightness >= 0) {
			await ScreenBrightness.setBrightness({ brightness: savedBrightness });
		} else {
			await ScreenBrightness.setBrightness({ brightness: -1 });
		}
		savedBrightness = null;
	} catch {
		// Screen brightness plugin unavailable.
	}
}
