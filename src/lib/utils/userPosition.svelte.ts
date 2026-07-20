import {

	getCurrentPosition as readCurrentPosition,

	geolocationErrorMessage,

	getLocationPermissionStatus,

	isLocationSupported,

	locationPermissionErrorMessage,

	requestLocationPermissions,

	startWatching,

	stopWatching,

	type LocationReading,

	type LocationWatchHandle

} from '$lib/utils/locationProvider';

import {

	createAltitudeSmootherState,

	getTrimmedMeanAltitude,

	pushAltitudeSample,

	resetAltitudeSmootherState,

	type AltitudeSmootherState

} from '$lib/utils/altitudeSmoothing';

import { smoothLocationReading } from '$lib/utils/locationSmoothing';

import {

	profileFromPurpose,

	type GpsProfile,

	type GpsPurpose

} from '$lib/utils/geo';

import {

	acquireConsumer,

	capProfileForPowerSaving,

	clearConsumers,

	COMPASS_GPS_CONSUMER_ID,

	isCaptureProfile,
	releaseConsumer,
	resolveActiveProfile,
	shouldSuspendForAppBackground,
	resolveGpsLiveRefreshThresholdMs,
	resolveGpsStaleRecovery,
	resolveGpsStaleThresholdMs,
	shouldRunGpsStaleWatchdog,
	shouldRunLiveGpsRefresh,

	type GpsConsumerMap

} from '$lib/utils/gpsSession';

import { haversineBearingDeg, haversineDistanceM, normalizeHeading360 } from '$lib/utils/haversine';

import * as m from '$lib/paraglide/messages.js';

import {
	shouldDeferGpsSyncForCamera,
	registerCameraSessionDeferredHandlers
} from '$lib/utils/cameraCaptureSession';

import { isNativeApp } from '$lib/utils/platform';

import { powerSavingModeState } from '$lib/stores/powerSavingMode.svelte';

import { App } from '@capacitor/app';

import { shouldSkipPositionPublish } from '$lib/utils/positionPublishPolicy';



export interface UserPosition {

	latitude: number;

	longitude: number;

	accuracyMeters: number | null;

	altitudeMeters: number | null;

	courseDegrees: number | null;

	speedMps: number | null;

}



export const userPositionState = $state({

	position: null as UserPosition | null,

	watching: false,

	error: '' as string

});



const LEGACY_CONSUMER_ID = '_legacy';



let watchHandle: LocationWatchHandle | null = null;

const positionListeners = new Set<(position: UserPosition) => void>();

let lastWatchCoords: { latitude: number; longitude: number } | null = null;

let lastSmoothedReading: LocationReading | null = null;

let altitudeSmootherState: AltitudeSmootherState = createAltitudeSmootherState();

let activeProfile: GpsProfile | null = null;

let consumers: GpsConsumerMap = new Map();

let appPaused = false;

let syncHardwareWatchInFlight: Promise<void> | null = null;
let syncHardwareWatchPending = false;

let appLifecycleInitialized = false;

let lastGpsUpdateAt: number | null = null;

let lastPublishedAt: number | null = null;

let lastPublishedCoords: { latitude: number; longitude: number } | null = null;

let staleRecoveryStage: 'none' | 'requested-fix' = 'none';

let watchdogTimer: ReturnType<typeof setInterval> | null = null;
let liveRefreshTimer: ReturnType<typeof setInterval> | null = null;

const GPS_STALE_CHECK_MS = 5_000;
const GPS_LIVE_REFRESH_CHECK_MS = 4_000;



const MIN_DERIVED_COURSE_SPEED_MPS = 0.8;

const MIN_DERIVED_COURSE_DISTANCE_M = 1;



function resolveProfile(profileOrPurpose: GpsProfile | GpsPurpose): GpsProfile {

	if (profileOrPurpose === 'capture' || profileOrPurpose === 'watch') {

		return profileFromPurpose(profileOrPurpose);

	}

	return profileOrPurpose;

}



function touchLastGpsWatchUpdate(): void {
	lastGpsUpdateAt = Date.now();
	staleRecoveryStage = 'none';
}

function touchLastGpsFixUpdate(): void {
	lastGpsUpdateAt = Date.now();
}



export function getLastGpsUpdateAt(): number | null {

	return lastGpsUpdateAt;

}



function stopWatchdog(): void {
	if (!watchdogTimer) {
		return;
	}
	clearInterval(watchdogTimer);
	watchdogTimer = null;
}

function stopLiveRefresh(): void {
	if (!liveRefreshTimer) {
		return;
	}
	clearInterval(liveRefreshTimer);
	liveRefreshTimer = null;
}

function syncGpsTimers(profile: GpsProfile, consumerMap: GpsConsumerMap): void {
	if (shouldRunGpsStaleWatchdog(profile, consumerMap)) {
		if (!watchdogTimer) {
			watchdogTimer = setInterval(() => {
				void checkNavigationGpsStale();
			}, GPS_STALE_CHECK_MS);
		}
	} else {
		stopWatchdog();
	}

	if (shouldRunLiveGpsRefresh(profile, consumerMap)) {
		if (!liveRefreshTimer) {
			liveRefreshTimer = setInterval(() => {
				void checkLiveGpsRefresh();
			}, GPS_LIVE_REFRESH_CHECK_MS);
		}
	} else {
		stopLiveRefresh();
	}
}

function resolveGpsTimerPolicyKey(
	profile: GpsProfile | null,
	consumerMap: GpsConsumerMap
): string {
	if (!profile) {
		return 'off';
	}
	return `${shouldRunLiveGpsRefresh(profile, consumerMap)}:${shouldRunGpsStaleWatchdog(profile, consumerMap)}`;
}

async function checkLiveGpsRefresh(): Promise<void> {
	if (
		!shouldRunLiveGpsRefresh(activeProfile, consumers) ||
		consumers.size === 0 ||
		!userPositionState.watching
	) {
		return;
	}

	if (lastGpsUpdateAt === null) {
		return;
	}

	const refreshThresholdMs = resolveGpsLiveRefreshThresholdMs(activeProfile ?? 'watch');
	const elapsed = Date.now() - lastGpsUpdateAt;

	if (elapsed < refreshThresholdMs) {
		return;
	}

	await requestCurrentPosition(activeProfile ?? 'watch');
}



async function checkNavigationGpsStale(): Promise<void> {

	if (
		!shouldRunGpsStaleWatchdog(activeProfile, consumers) ||
		consumers.size === 0 ||
		!userPositionState.watching
	) {

		return;

	}

	if (lastGpsUpdateAt === null) {

		return;

	}

	const staleThresholdMs = resolveGpsStaleThresholdMs(activeProfile ?? 'navigation');
	const elapsed = Date.now() - lastGpsUpdateAt;

	const action = resolveGpsStaleRecovery(
		elapsed,
		staleThresholdMs,
		staleRecoveryStage === 'requested-fix'
	);

	if (action === 'none') {

		return;

	}

	if (action === 'request-fix') {

		staleRecoveryStage = 'requested-fix';

		await requestCurrentPosition(activeProfile ?? 'navigation');

		return;

	}

	staleRecoveryStage = 'none';

	await stopHardwareWatch();

	if (activeProfile) {

		await startHardwareWatch(activeProfile);

	}

}



function resolveCourseDegrees(

	reading: LocationReading,

	previous: { latitude: number; longitude: number } | null

): number | null {

	if (reading.heading !== null) {

		return normalizeHeading360(reading.heading);

	}



	if (

		previous &&

		reading.speedMps !== null &&

		reading.speedMps >= MIN_DERIVED_COURSE_SPEED_MPS

	) {

		const movedMeters = haversineDistanceM(

			previous.latitude,

			previous.longitude,

			reading.latitude,

			reading.longitude

		);

		if (movedMeters >= MIN_DERIVED_COURSE_DISTANCE_M) {

			return haversineBearingDeg(

				previous.latitude,

				previous.longitude,

				reading.latitude,

				reading.longitude

			);

		}

	}



	return null;

}



function resolveAltitudeMeters(reading: LocationReading): number | null {

	if (!isCaptureProfile(activeProfile)) {

		return reading.altitudeMeters;

	}



	pushAltitudeSample(altitudeSmootherState, reading.altitudeMeters, reading.timestamp);

	return getTrimmedMeanAltitude(altitudeSmootherState);

}



function toUserPosition(reading: LocationReading): UserPosition {

	const positionReading = isCaptureProfile(activeProfile)

		? reading

		: smoothLocationReading(lastSmoothedReading, reading);



	if (!isCaptureProfile(activeProfile)) {

		lastSmoothedReading = positionReading;

	}



	const courseDegrees = resolveCourseDegrees(positionReading, lastWatchCoords);

	lastWatchCoords = {

		latitude: positionReading.latitude,

		longitude: positionReading.longitude

	};



	return {

		latitude: positionReading.latitude,

		longitude: positionReading.longitude,

		accuracyMeters: positionReading.accuracyMeters,

		altitudeMeters: resolveAltitudeMeters(reading),

		courseDegrees,

		speedMps: positionReading.speedMps

	};

}



function publishUserPosition(position: UserPosition): void {
	userPositionState.position = position;
	userPositionState.error = '';
	lastPublishedAt = Date.now();
	lastPublishedCoords = {
		latitude: position.latitude,
		longitude: position.longitude
	};

	for (const listener of positionListeners) {
		listener(position);
	}
}

function handleLocationUpdate(reading: LocationReading): void {
	touchLastGpsWatchUpdate();

	const position = toUserPosition(reading);

	if (
		shouldSkipPositionPublish({
			profile: activeProfile,
			published: lastPublishedCoords,
			lastPublishedAt,
			now: Date.now(),
			next: {
				latitude: position.latitude,
				longitude: position.longitude
			},
			liveNavigationActive: consumers.has(COMPASS_GPS_CONSUMER_ID)
		})
	) {
		return;
	}

	publishUserPosition(position);
}

/** Movement-filtered position for UI (ParkingPanel, map markers). */
export function getPublishedUserPosition(): UserPosition | null {
	return userPositionState.position;
}



export function onUserPositionChange(listener: (position: UserPosition) => void): () => void {
	positionListeners.add(listener);
	return () => {
		positionListeners.delete(listener);
	};
}



function resolveEffectiveProfile(): GpsProfile | null {
	const profile = resolveActiveProfile(consumers);
	if (!profile) {
		return null;
	}
	if (powerSavingModeState.active) {
		return capProfileForPowerSaving(profile);
	}
	return profile;
}


function handleLocationPermissionFailure(): void {

	void getLocationPermissionStatus().then((status) => {

		userPositionState.error = locationPermissionErrorMessage(status);

	});

}



async function ensureLocationPermission(): Promise<boolean> {

	const granted = await requestLocationPermissions();

	if (granted) {

		return true;

	}

	handleLocationPermissionFailure();

	return false;

}



function handleLocationError(message: string): void {

	userPositionState.error = message;

}



async function startForegroundWatch(profile: GpsProfile): Promise<void> {

	watchHandle = await startWatching(handleLocationUpdate, handleLocationError, profile);

}



let pendingStop: Promise<void> = Promise.resolve();



async function stopHardwareWatch(): Promise<void> {

	pendingStop = (async () => {

		await pendingStop;

		await stopWatching(watchHandle);

		watchHandle = null;

	})();

	await pendingStop;

}



function shouldSuspendForBackground(): boolean {
	return shouldSuspendForAppBackground(appPaused);
}



async function startHardwareWatch(profile: GpsProfile): Promise<void> {

	const permitted = await ensureLocationPermission();

	if (!permitted) {

		userPositionState.watching = false;

		return;

	}



	try {

		await startForegroundWatch(profile);

		userPositionState.watching = true;

		userPositionState.error = '';

		syncGpsTimers(profile, consumers);

	} catch (error) {

		userPositionState.error = geolocationErrorMessage(error);

		userPositionState.watching = false;

		stopWatchdog();
		stopLiveRefresh();

	}

}



async function runSyncHardwareWatch(): Promise<void> {
	const nextProfile = resolveEffectiveProfile();

	if (!nextProfile || shouldSuspendForBackground()) {
		if (watchHandle) {
			await stopHardwareWatch();
		}

		stopWatchdog();
		stopLiveRefresh();

		userPositionState.watching = false;

		if (!nextProfile) {
			activeProfile = null;

			lastWatchCoords = null;

			lastSmoothedReading = null;

			lastPublishedAt = null;

			lastPublishedCoords = null;

			resetAltitudeSmootherState(altitudeSmootherState);
		}

		return;
	}

	if (nextProfile === activeProfile && watchHandle) {
		syncGpsTimers(nextProfile, consumers);
		return;
	}

	await stopHardwareWatch();

	if (nextProfile !== activeProfile) {
		lastWatchCoords = null;

		lastSmoothedReading = null;

		if (!isCaptureProfile(nextProfile)) {
			resetAltitudeSmootherState(altitudeSmootherState);
		}
	}

	activeProfile = nextProfile;

	await startHardwareWatch(nextProfile);
}

async function syncHardwareWatch(): Promise<void> {
	if (syncHardwareWatchInFlight) {
		syncHardwareWatchPending = true;
		return syncHardwareWatchInFlight;
	}

	syncHardwareWatchInFlight = (async () => {
		try {
			do {
				syncHardwareWatchPending = false;
				await runSyncHardwareWatch();
			} while (syncHardwareWatchPending);
		} finally {
			syncHardwareWatchInFlight = null;
		}
	})();

	return syncHardwareWatchInFlight;
}



function ensureAppLifecycleListener(): void {

	if (appLifecycleInitialized || !isNativeApp()) {

		return;

	}



	appLifecycleInitialized = true;

	registerCameraSessionDeferredHandlers({
		onGpsSyncDeferred: () => {
			void syncHardwareWatch();
		}
	});

	void App.addListener('appStateChange', ({ isActive }) => {

		appPaused = !isActive;

		if (shouldDeferGpsSyncForCamera()) {
			return;
		}

		void syncHardwareWatch();

	});

}



function requestWatchSync(): void {

	ensureAppLifecycleListener();

	void syncHardwareWatch();

}



export function acquireLocationWatch(consumerId: string, profile: GpsProfile): () => void {

	if (!isLocationSupported()) {

		userPositionState.error = m.geo_not_supported();

		return () => {};

	}



	const previousProfile = resolveEffectiveProfile();
	const timerPolicyBefore = resolveGpsTimerPolicyKey(previousProfile, consumers);

	acquireConsumer(consumers, consumerId, profile);

	const nextProfile = resolveEffectiveProfile();
	const timerPolicyAfter = resolveGpsTimerPolicyKey(nextProfile, consumers);

	if (nextProfile !== previousProfile || !watchHandle || timerPolicyBefore !== timerPolicyAfter) {

		requestWatchSync();

	}



	return () => releaseLocationWatch(consumerId);

}



export function releaseLocationWatch(consumerId: string): void {

	if (!consumers.has(consumerId)) {

		return;

	}

	const previousProfile = resolveEffectiveProfile();
	const timerPolicyBefore = resolveGpsTimerPolicyKey(previousProfile, consumers);

	releaseConsumer(consumers, consumerId);

	const nextProfile = resolveEffectiveProfile();
	const timerPolicyAfter = resolveGpsTimerPolicyKey(nextProfile, consumers);

	if (nextProfile !== previousProfile || timerPolicyBefore !== timerPolicyAfter) {
		void syncHardwareWatch();
	}

}



export function startWatchingPosition(purpose: GpsPurpose = 'watch'): void {

	acquireLocationWatch(LEGACY_CONSUMER_ID, resolveProfile(purpose));

}



export function stopWatchingPosition(): Promise<void> {
	clearConsumers(consumers);
	return syncHardwareWatch();
}

let parkingWatchResyncTimer: ReturnType<typeof setTimeout> | null = null;
let powerSavingWatchResyncTimer: ReturnType<typeof setTimeout> | null = null;
const PARKING_WATCH_RESYNC_DEBOUNCE_MS = 300;
const POWER_SAVING_WATCH_RESYNC_DEBOUNCE_MS = 300;

export function resyncLocationWatchAfterPowerSavingChange(): Promise<void> {
	return new Promise((resolve) => {
		if (powerSavingWatchResyncTimer) {
			clearTimeout(powerSavingWatchResyncTimer);
		}

		powerSavingWatchResyncTimer = setTimeout(() => {
			powerSavingWatchResyncTimer = null;
			ensureAppLifecycleListener();
			void syncHardwareWatch().then(() => resolve());
		}, POWER_SAVING_WATCH_RESYNC_DEBOUNCE_MS);
	});
}

export function resyncLocationWatchAfterParkingChange(): void {
	if (parkingWatchResyncTimer) {
		clearTimeout(parkingWatchResyncTimer);
	}

	parkingWatchResyncTimer = setTimeout(() => {
		parkingWatchResyncTimer = null;
		ensureAppLifecycleListener();
		void syncHardwareWatch();
	}, PARKING_WATCH_RESYNC_DEBOUNCE_MS);
}



export async function requestCurrentPosition(

	profileOrPurpose: GpsProfile | GpsPurpose = 'watch'

): Promise<UserPosition | null> {

	if (!isLocationSupported()) {

		userPositionState.error = m.geo_not_supported();

		return null;

	}



	const profile = resolveProfile(profileOrPurpose);



	try {

		await ensureLocationPermission();

		const permission = await getLocationPermissionStatus();

		if (permission !== 'granted') {

			handleLocationPermissionFailure();

			return null;

		}



		const reading = await readCurrentPosition(profile);

		const previousProfile = activeProfile;

		activeProfile = profile;

		const position = toUserPosition(reading);

		activeProfile = previousProfile;

		publishUserPosition(position);

		touchLastGpsFixUpdate();

		return position;

	} catch (error) {

		userPositionState.error = geolocationErrorMessage(error);

		return null;

	}

}



export function getActiveWatchProfile(): GpsProfile | null {

	return activeProfile;

}



/** @deprecated Use getActiveWatchProfile */

export function getActiveWatchPurpose(): GpsPurpose {

	return activeProfile === 'capture' ? 'capture' : 'watch';

}



export function resetPositionSmoothing(): void {

	lastWatchCoords = null;

	lastSmoothedReading = null;

	lastPublishedAt = null;

	lastPublishedCoords = null;

	resetAltitudeSmootherState(altitudeSmootherState);

}



export function getSmoothedAltitudeMeters(): number | null {
	return getTrimmedMeanAltitude(altitudeSmootherState);
}

/** @internal Test hook for stale GPS recovery. */
export function __checkGpsStaleForTests(): Promise<void> {
	return checkNavigationGpsStale();
}

/** @internal Test hook for proactive live GPS refresh. */
export function __checkLiveGpsRefreshForTests(): Promise<void> {
	return checkLiveGpsRefresh();
}

export function __resetUserPositionForTests(): void {
	userPositionState.position = null;
	userPositionState.watching = false;
	userPositionState.error = '';
	watchHandle = null;
	positionListeners.clear();
	lastWatchCoords = null;
	lastSmoothedReading = null;
	altitudeSmootherState = createAltitudeSmootherState();
	activeProfile = null;
	consumers = new Map();
	appPaused = false;
	syncHardwareWatchInFlight = null;
	syncHardwareWatchPending = false;
	lastGpsUpdateAt = null;
	lastPublishedAt = null;
	lastPublishedCoords = null;
	staleRecoveryStage = 'none';
	stopWatchdog();
	stopLiveRefresh();
	pendingStop = Promise.resolve();
	if (parkingWatchResyncTimer) {
		clearTimeout(parkingWatchResyncTimer);
		parkingWatchResyncTimer = null;
	}
	resetPositionSmoothing();
}

