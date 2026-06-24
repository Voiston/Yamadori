import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativeApp } from '$lib/utils/platform';

export async function hapticLight(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		await Haptics.impact({ style: ImpactStyle.Light });
	} catch {
		// Haptics unavailable.
	}
}

export async function hapticSuccess(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		await Haptics.notification({ type: NotificationType.Success });
	} catch {
		// Haptics unavailable.
	}
}

export async function hapticSelection(): Promise<void> {
	if (!isNativeApp()) {
		return;
	}

	try {
		await Haptics.selectionChanged();
	} catch {
		// Haptics unavailable.
	}
}
