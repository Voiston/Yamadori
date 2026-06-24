import * as m from '$lib/paraglide/messages.js';
import { GPS_EXCELLENT_ACCURACY_THRESHOLD_M } from '$lib/utils/geo';

export function getGpsCaptureWaitingHint(online: boolean): string {
	if (online) {
		return m.gps_waiting_online();
	}
	return m.gps_waiting_offline();
}

export function getGpsCaptureReadyHint(online: boolean, accuracyMeters: number | null): string {
	if (accuracyMeters !== null && accuracyMeters <= GPS_EXCELLENT_ACCURACY_THRESHOLD_M) {
		return m.gps_ready_excellent();
	}

	if (online) {
		return m.gps_ready_online();
	}

	return m.gps_ready_offline();
}

export function getGpsCaptureTips(): string[] {
	return [
		m.gps_tip_photo(),
		m.gps_tip_still(),
		m.gps_tip_sky(),
		m.gps_tip_offline_mountain(),
		m.gps_tip_android_precise()
	];
}

export function getAndroidVolumeButtonHint(): string {
	return m.gps_volume_hint();
}
