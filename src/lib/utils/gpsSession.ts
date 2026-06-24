import type { GpsProfile } from '$lib/utils/geo';

const PROFILE_PRIORITY: Record<GpsProfile, number> = {
	capture: 4,
	navigation: 3,
	watch: 2,
	proximity: 1
};

export type GpsConsumerMap = Map<string, GpsProfile>;

export function resolveActiveProfile(consumers: GpsConsumerMap): GpsProfile | null {
	let best: GpsProfile | null = null;
	let bestPriority = 0;

	for (const profile of consumers.values()) {
		const priority = PROFILE_PRIORITY[profile];
		if (priority > bestPriority) {
			bestPriority = priority;
			best = profile;
		}
	}

	return best;
}

export function acquireConsumer(
	consumers: GpsConsumerMap,
	consumerId: string,
	profile: GpsProfile
): GpsProfile | null {
	consumers.set(consumerId, profile);
	return resolveActiveProfile(consumers);
}

export function releaseConsumer(
	consumers: GpsConsumerMap,
	consumerId: string
): GpsProfile | null {
	consumers.delete(consumerId);
	return resolveActiveProfile(consumers);
}

export function clearConsumers(consumers: GpsConsumerMap): void {
	consumers.clear();
}

export function shouldUseBackgroundWatch(
	profile: GpsProfile,
	backgroundTrackingEnabled: boolean,
	backgroundSupported: boolean
): boolean {
	return (
		(profile === 'watch' || profile === 'navigation' || profile === 'proximity') &&
		backgroundTrackingEnabled &&
		backgroundSupported
	);
}

export function shouldSuspendForAppBackground(
	appPaused: boolean,
	backgroundTrackingEnabled: boolean
): boolean {
	return appPaused && !backgroundTrackingEnabled;
}

export function isCaptureProfile(profile: GpsProfile | null): boolean {
	return profile === 'capture';
}

export const GPS_NAVIGATION_STALE_MS = 10_000;

export type GpsStaleRecoveryAction = 'none' | 'request-fix' | 'restart-watch';

/** Decide how to recover when navigation GPS updates have gone silent. */
export function resolveGpsStaleRecovery(
	elapsedSinceUpdateMs: number,
	staleThresholdMs: number,
	alreadyRequestedFix: boolean
): GpsStaleRecoveryAction {
	if (elapsedSinceUpdateMs < staleThresholdMs) {
		return 'none';
	}
	if (!alreadyRequestedFix) {
		return 'request-fix';
	}
	return 'restart-watch';
}
