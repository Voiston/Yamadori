import { VolumeButtons } from '@capacitor-community/volume-buttons';
import { isAndroidApp } from '$lib/utils/platform';

const DEBOUNCE_MS = 300;

export type VolumeButtonHandlers = {
	onUp?: () => void;
	onDown?: () => void;
};

let lastEventAt = 0;

function debounced(handler: (() => void) | undefined): void {
	if (!handler) {
		return;
	}

	const now = Date.now();
	if (now - lastEventAt < DEBOUNCE_MS) {
		return;
	}
	lastEventAt = now;
	handler();
}

export async function startVolumeButtonWatch(handlers: VolumeButtonHandlers): Promise<void> {
	if (!isAndroidApp()) {
		return;
	}

	try {
		await VolumeButtons.clearWatch();
	} catch {
		// No active watch.
	}

	try {
		await VolumeButtons.watchVolume({ suppressVolumeIndicator: true }, (result) => {
			if (result.direction === 'up') {
				debounced(handlers.onUp);
			} else if (result.direction === 'down') {
				debounced(handlers.onDown);
			}
		});
	} catch {
		// Volume buttons unavailable.
	}
}

export async function stopVolumeButtonWatch(): Promise<void> {
	if (!isAndroidApp()) {
		return;
	}

	try {
		await VolumeButtons.clearWatch();
	} catch {
		// No active watch.
	}
}
