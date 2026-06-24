import { isPoorAccuracy } from '$lib/utils/gps';

/** Reuse watch position at save when still fresh — avoids a cold high-accuracy fix. */
export const CAPTURE_SAVE_POSITION_MAX_AGE_MS = 10_000;

export type CaptureSavePosition = {
	latitude: number;
	longitude: number;
	accuracyMeters: number | null;
};

export function canReuseCapturePosition(
	position: CaptureSavePosition | null,
	lastUpdatedAt: number | null,
	now = Date.now()
): boolean {
	if (!position || lastUpdatedAt === null) {
		return false;
	}
	if (isPoorAccuracy(position.accuracyMeters)) {
		return false;
	}
	return now - lastUpdatedAt <= CAPTURE_SAVE_POSITION_MAX_AGE_MS;
}

export async function ensureCapturePositionForSave(
	position: CaptureSavePosition | null,
	lastUpdatedAt: number | null,
	requestFresh: () => Promise<unknown>
): Promise<'reused' | 'fetched'> {
	if (canReuseCapturePosition(position, lastUpdatedAt)) {
		return 'reused';
	}
	await requestFresh();
	return 'fetched';
}
