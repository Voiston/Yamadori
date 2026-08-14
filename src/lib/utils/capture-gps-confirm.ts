import { isPoorAccuracy } from '$lib/utils/gps';
import type { LocationPermissionStatus } from '$lib/utils/locationProvider';

export type CaptureGpsPosition = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
};

export type LocationPromptBeforePhotoReason =
	| 'prompt'
	| 'denied'
	| 'coarse-only'
	| 'unavailable'
	| 'unsupported';

export type LocationPromptBeforePhotoInput = {
	permissionStatus: LocationPermissionStatus;
	hasPosition: boolean;
	locationError: string;
};

export function shouldConfirmGpsBeforeSave(position: CaptureGpsPosition | null): boolean {
	if (!position) {
		return true;
	}
	return isPoorAccuracy(position.accuracyMeters);
}

/** True when location is broken (permission / services), not merely still acquiring. */
export function needsLocationPromptBeforePhoto(
	input: LocationPromptBeforePhotoInput
): LocationPromptBeforePhotoReason | null {
	const { permissionStatus, hasPosition, locationError } = input;

	if (permissionStatus === 'prompt') {
		return 'prompt';
	}
	if (permissionStatus === 'denied') {
		return 'denied';
	}
	if (permissionStatus === 'coarse-only') {
		return 'coarse-only';
	}
	if (permissionStatus === 'unsupported') {
		return 'unsupported';
	}
	if (locationError && !hasPosition) {
		return 'unavailable';
	}
	return null;
}
