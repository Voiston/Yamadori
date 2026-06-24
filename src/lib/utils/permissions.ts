import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { requestFusedHeadingPermission } from '$lib/utils/headingProvider';
import { isNativeApp } from '$lib/utils/platform';
import { VoiceRecorder } from 'capacitor-voice-recorder';

export async function requestLocationPermission(): Promise<boolean> {
	if (!isNativeApp()) {
		return typeof navigator !== 'undefined' && 'geolocation' in navigator;
	}

	try {
		const status = await Geolocation.requestPermissions({ permissions: ['location'] });
		return status.location === 'granted';
	} catch {
		return false;
	}
}

export async function requestCameraPermission(): Promise<boolean> {
	if (!isNativeApp()) {
		return true;
	}

	try {
		const status = await Camera.requestPermissions({ permissions: ['camera'] });
		return status.camera === 'granted';
	} catch {
		return false;
	}
}

export async function requestMicrophonePermission(): Promise<boolean> {
	if (!isNativeApp()) {
		return true;
	}

	try {
		const hasPermission = await VoiceRecorder.hasAudioRecordingPermission();
		if (hasPermission.value) {
			return true;
		}
		const { value } = await VoiceRecorder.requestAudioRecordingPermission();
		return value === true;
	} catch {
		return false;
	}
}

export async function requestNotificationPermission(): Promise<boolean> {
	if (!isNativeApp()) {
		return true;
	}

	try {
		const status = await LocalNotifications.requestPermissions();
		return status.display === 'granted';
	} catch {
		return false;
	}
}

export async function requestCompassPermission(): Promise<boolean> {
	return requestFusedHeadingPermission();
}
