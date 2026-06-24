import { isPoorAccuracy } from '$lib/utils/gps';

export type CaptureGpsPosition = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
};

export function shouldConfirmGpsBeforeSave(position: CaptureGpsPosition | null): boolean {
	if (!position) {
		return true;
	}
	return isPoorAccuracy(position.accuracyMeters);
}
