import { haversineDistanceM } from '$lib/utils/haversine';
import type { GpsProfile } from '$lib/utils/geo';
import { isCaptureProfile } from '$lib/utils/gpsSession';

/** Minimum displacement before publishing a new position to reactive state. */
export const POSITION_PUBLISH_MIN_MOVE_M = 15;

/** Force a publish if the last one is older than this (avoids a frozen UI). */
export const POSITION_PUBLISH_MAX_STALE_MS = 45_000;

export type PublishCoords = {
	latitude: number;
	longitude: number;
};

export function shouldSkipPositionPublish(options: {
	profile: GpsProfile | null;
	published: PublishCoords | null;
	lastPublishedAt: number | null;
	now: number;
	next: PublishCoords;
	liveNavigationActive?: boolean;
}): boolean {
	if (options.liveNavigationActive) {
		return false;
	}

	if (isCaptureProfile(options.profile) || options.profile === 'navigation') {
		return false;
	}

	if (!options.published) {
		return false;
	}

	const elapsed = options.now - (options.lastPublishedAt ?? 0);
	if (elapsed >= POSITION_PUBLISH_MAX_STALE_MS) {
		return false;
	}

	const movedM = haversineDistanceM(
		options.next.latitude,
		options.next.longitude,
		options.published.latitude,
		options.published.longitude
	);

	return movedM < POSITION_PUBLISH_MIN_MOVE_M;
}
