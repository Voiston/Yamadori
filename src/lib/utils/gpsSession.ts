import type { GpsProfile } from '$lib/utils/geo';

const PROFILE_PRIORITY: Record<GpsProfile, number> = {
	capture: 4,
	navigation: 3,
	watch: 2,
	proximity: 1
};

export type GpsConsumerMap = Map<string, GpsProfile>;

export const COMPASS_GPS_CONSUMER_ID = 'compass';

export function shouldRunGpsStaleWatchdog(
	profile: GpsProfile | null,
	consumers: GpsConsumerMap
): boolean {
	return (
		profile === 'navigation' ||
		profile === 'capture' ||
		consumers.has(COMPASS_GPS_CONSUMER_ID)
	);
}

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

export function shouldSuspendForAppBackground(appPaused: boolean): boolean {
	return appPaused;
}

/** Caps continuous GPS profiles during power saving; capture stays accurate for photos. */
export function capProfileForPowerSaving(profile: GpsProfile): GpsProfile {
	return profile === 'capture' ? profile : 'proximity';
}

export function isCaptureProfile(profile: GpsProfile | null): boolean {
	return profile === 'capture';
}

export const GPS_NAVIGATION_STALE_MS = 10_000;

/** Stale thresholds aligned with Android watch intervals (interval + margin). */
const GPS_STALE_THRESHOLD_MS: Record<GpsProfile, number> = {
	capture: 5_000,
	navigation: GPS_NAVIGATION_STALE_MS,
	watch: 12_000,
	proximity: 20_000
};

export function resolveGpsStaleThresholdMs(profile: GpsProfile): number {
	return GPS_STALE_THRESHOLD_MS[profile];
}

export function shouldRunLiveGpsRefresh(
	profile: GpsProfile | null,
	consumers: GpsConsumerMap
): boolean {
	return (
		isCaptureProfile(profile) ||
		profile === 'navigation' ||
		consumers.has(COMPASS_GPS_CONSUMER_ID)
	);
}

/** Proactive refresh when watch callbacks go quiet — half the stale threshold. */
export function resolveGpsLiveRefreshThresholdMs(profile: GpsProfile): number {
	return Math.floor(resolveGpsStaleThresholdMs(profile) / 2);
}

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
