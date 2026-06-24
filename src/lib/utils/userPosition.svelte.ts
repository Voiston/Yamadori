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

	isBackgroundLocationSupported,

	isBackgroundWatching,

	startBackgroundWatching,

	stopBackgroundWatching

} from '$lib/utils/backgroundLocation';

import { locationSettingsState } from '$lib/stores/locationSettings.svelte';

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

	clearConsumers,

	isCaptureProfile,

	releaseConsumer,

	resolveActiveProfile,

	shouldSuspendForAppBackground,

	shouldUseBackgroundWatch,

	resolveGpsStaleRecovery,

	GPS_NAVIGATION_STALE_MS,

	type GpsConsumerMap

} from '$lib/utils/gpsSession';

import { haversineBearingDeg, haversineDistanceM, normalizeHeading360 } from '$lib/utils/haversine';

import { debugCounters, debugLog } from '$lib/utils/debug-log';

import { isNativeApp } from '$lib/utils/platform';

import { App } from '@capacitor/app';



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

let backgroundWatchId: string | null = null;

let lastWatchCoords: { latitude: number; longitude: number } | null = null;

let lastSmoothedReading: LocationReading | null = null;

let altitudeSmootherState: AltitudeSmootherState = createAltitudeSmootherState();

let activeProfile: GpsProfile | null = null;

let consumers: GpsConsumerMap = new Map();

let appPaused = false;

let appLifecycleInitialized = false;

let lastGpsUpdateAt: number | null = null;

let staleRecoveryStage: 'none' | 'requested-fix' = 'none';

let watchdogTimer: ReturnType<typeof setInterval> | null = null;

const GPS_STALE_CHECK_MS = 5_000;



const MIN_DERIVED_COURSE_SPEED_MPS = 0.8;

const MIN_DERIVED_COURSE_DISTANCE_M = 1;



function resolveProfile(profileOrPurpose: GpsProfile | GpsPurpose): GpsProfile {

	if (profileOrPurpose === 'capture' || profileOrPurpose === 'watch') {

		return profileFromPurpose(profileOrPurpose);

	}

	return profileOrPurpose;

}



function touchLastGpsUpdate(): void {

	lastGpsUpdateAt = Date.now();

	staleRecoveryStage = 'none';

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

function ensureWatchdogRunning(): void {
	if (activeProfile !== 'navigation') {
		stopWatchdog();
		return;
	}
	if (watchdogTimer) {
		return;
	}
	watchdogTimer = setInterval(() => {
		void checkNavigationGpsStale();
	}, GPS_STALE_CHECK_MS);
}



async function checkNavigationGpsStale(): Promise<void> {

	if (activeProfile !== 'navigation' || consumers.size === 0 || !userPositionState.watching) {

		return;

	}

	if (lastGpsUpdateAt === null) {

		return;

	}

	const elapsed = Date.now() - lastGpsUpdateAt;

	const action = resolveGpsStaleRecovery(

		elapsed,

		GPS_NAVIGATION_STALE_MS,

		staleRecoveryStage === 'requested-fix'

	);

	if (action === 'none') {

		return;

	}

	if (action === 'request-fix') {

		staleRecoveryStage = 'requested-fix';

		await requestCurrentPosition('navigation');

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



function handleLocationUpdate(reading: LocationReading): void {

	touchLastGpsUpdate();

	userPositionState.position = toUserPosition(reading);

	userPositionState.error = '';

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



async function startBackgroundWatch(): Promise<void> {

	const handle = await startBackgroundWatching(handleLocationUpdate, handleLocationError);

	backgroundWatchId = handle.id;

}



let pendingStop: Promise<void> = Promise.resolve();



async function stopHardwareWatch(): Promise<void> {

	pendingStop = (async () => {

		await pendingStop;

		await stopWatching(watchHandle);

		watchHandle = null;



		if (backgroundWatchId || isBackgroundWatching()) {

			await stopBackgroundWatching();

			backgroundWatchId = null;

		}

	})();



	await pendingStop;

}



function shouldSuspendForBackground(): boolean {
	return shouldSuspendForAppBackground(appPaused, locationSettingsState.backgroundTrackingEnabled);
}



async function startHardwareWatch(profile: GpsProfile): Promise<void> {

	const permitted = await ensureLocationPermission();

	if (!permitted) {

		userPositionState.watching = false;

		return;

	}



	const useBackground = shouldUseBackgroundWatch(

		profile,

		locationSettingsState.backgroundTrackingEnabled,

		isBackgroundLocationSupported()

	);



	try {

		if (useBackground) {

			await startBackgroundWatch();

		} else {

			await startForegroundWatch(profile);

		}

		userPositionState.watching = true;

		userPositionState.error = '';

		if (profile === 'navigation') {
			ensureWatchdogRunning();
		} else {
			stopWatchdog();
		}

	} catch (error) {

		userPositionState.error = geolocationErrorMessage(error);

		userPositionState.watching = false;

		stopWatchdog();

	}

}



async function syncHardwareWatch(): Promise<void> {

	const nextProfile = resolveActiveProfile(consumers);



	if (!nextProfile || shouldSuspendForBackground()) {

		if (watchHandle || backgroundWatchId) {

			await stopHardwareWatch();

		}

		stopWatchdog();

		userPositionState.watching = false;

		if (!nextProfile) {

			activeProfile = null;

			lastWatchCoords = null;

			lastSmoothedReading = null;

			resetAltitudeSmootherState(altitudeSmootherState);

		}

		return;

	}



	if (nextProfile === activeProfile && (watchHandle || backgroundWatchId)) {

		return;

	}



	debugCounters.gpsWatchStarts += 1;

	debugLog(

		'userPosition:syncHardwareWatch',

		'gps watch profile change',

		{

			profile: nextProfile,

			consumers: consumers.size,

			starts: debugCounters.gpsWatchStarts,

			stops: debugCounters.gpsWatchStops

		},

		'H6'

	);



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



function ensureAppLifecycleListener(): void {

	if (appLifecycleInitialized || !isNativeApp()) {

		return;

	}



	appLifecycleInitialized = true;

	void App.addListener('appStateChange', ({ isActive }) => {

		appPaused = !isActive;

		void syncHardwareWatch();

	});

}



function requestWatchSync(): void {

	ensureAppLifecycleListener();

	void syncHardwareWatch();

}



export function acquireLocationWatch(consumerId: string, profile: GpsProfile): () => void {

	if (!isLocationSupported()) {

		userPositionState.error = 'Géolocalisation non supportée';

		return () => {};

	}



	const previousProfile = resolveActiveProfile(consumers);

	acquireConsumer(consumers, consumerId, profile);

	const nextProfile = resolveActiveProfile(consumers);



	if (nextProfile !== previousProfile || !watchHandle) {

		requestWatchSync();

	}



	return () => releaseLocationWatch(consumerId);

}



export function releaseLocationWatch(consumerId: string): void {

	if (!consumers.has(consumerId)) {

		return;

	}



	debugCounters.gpsWatchStops += 1;

	debugLog(

		'userPosition:releaseLocationWatch',

		'gps consumer released',

		{ consumerId, stops: debugCounters.gpsWatchStops },

		'H6'

	);



	releaseConsumer(consumers, consumerId);

	void syncHardwareWatch();

}



export function startWatchingPosition(purpose: GpsPurpose = 'watch'): void {

	acquireLocationWatch(LEGACY_CONSUMER_ID, resolveProfile(purpose));

}



export function stopWatchingPosition(): Promise<void> {

	debugCounters.gpsWatchStops += 1;

	clearConsumers(consumers);

	return syncHardwareWatch();

}



export async function requestCurrentPosition(

	profileOrPurpose: GpsProfile | GpsPurpose = 'watch'

): Promise<UserPosition | null> {

	if (!isLocationSupported()) {

		userPositionState.error = 'Géolocalisation non supportée';

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

		userPositionState.position = position;

		userPositionState.error = '';

		touchLastGpsUpdate();

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

	resetAltitudeSmootherState(altitudeSmootherState);

}



export function getSmoothedAltitudeMeters(): number | null {
	return getTrimmedMeanAltitude(altitudeSmootherState);
}


