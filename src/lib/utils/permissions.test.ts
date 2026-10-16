import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
	mockGeolocationRequest,
	mockCameraRequest,
	mockVoiceHas,
	mockVoiceRequest,
	mockFusedHeading,
	mockIsNativeApp,
	mockNotifCheck,
	mockNotifRequest
} = vi.hoisted(() => ({
	mockGeolocationRequest: vi.fn(),
	mockCameraRequest: vi.fn(),
	mockVoiceHas: vi.fn(),
	mockVoiceRequest: vi.fn(),
	mockFusedHeading: vi.fn(),
	mockIsNativeApp: vi.fn(),
	mockNotifCheck: vi.fn(),
	mockNotifRequest: vi.fn()
}));

vi.mock('@capacitor/geolocation', () => ({
	Geolocation: {
		requestPermissions: mockGeolocationRequest
	}
}));

vi.mock('@capacitor/camera', () => ({
	Camera: {
		requestPermissions: mockCameraRequest
	}
}));

vi.mock('capacitor-voice-recorder', () => ({
	VoiceRecorder: {
		hasAudioRecordingPermission: mockVoiceHas,
		requestAudioRecordingPermission: mockVoiceRequest
	}
}));

vi.mock('@capacitor/local-notifications', () => ({
	LocalNotifications: {
		checkPermissions: mockNotifCheck,
		requestPermissions: mockNotifRequest
	}
}));

vi.mock('$lib/utils/headingProvider', () => ({
	requestFusedHeadingPermission: mockFusedHeading
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: (...args: unknown[]) => mockIsNativeApp(...args)
}));

import {
	requestCameraPermission,
	requestCompassPermission,
	requestLocationPermission,
	hasNotificationPermission,
	requestMicrophonePermission,
	requestNotificationPermission
} from './permissions';

describe('requestLocationPermission', () => {
	beforeEach(() => {
		mockIsNativeApp.mockReturnValue(true);
		mockGeolocationRequest.mockReset();
	});

	it('returns true when native location is granted', async () => {
		mockGeolocationRequest.mockResolvedValue({ location: 'granted' });

		await expect(requestLocationPermission()).resolves.toBe(true);
	});

	it('returns false when native location is denied', async () => {
		mockGeolocationRequest.mockResolvedValue({ location: 'denied' });

		await expect(requestLocationPermission()).resolves.toBe(false);
	});

	it('returns false when native request throws', async () => {
		mockGeolocationRequest.mockRejectedValue(new Error('plugin_error'));

		await expect(requestLocationPermission()).resolves.toBe(false);
	});

	it('uses web geolocation availability when not native', async () => {
		mockIsNativeApp.mockReturnValue(false);
		const expected = typeof navigator !== 'undefined' && 'geolocation' in navigator;

		await expect(requestLocationPermission()).resolves.toBe(expected);
	});
});

describe('requestCameraPermission', () => {
	beforeEach(() => {
		mockIsNativeApp.mockReturnValue(true);
		mockCameraRequest.mockReset();
	});

	it('returns true on web without calling Capacitor', async () => {
		mockIsNativeApp.mockReturnValue(false);

		await expect(requestCameraPermission()).resolves.toBe(true);
		expect(mockCameraRequest).not.toHaveBeenCalled();
	});

	it('returns true when camera is granted', async () => {
		mockCameraRequest.mockResolvedValue({ camera: 'granted' });

		await expect(requestCameraPermission()).resolves.toBe(true);
	});

	it('returns false when camera is denied or request fails', async () => {
		mockCameraRequest.mockResolvedValue({ camera: 'denied' });
		await expect(requestCameraPermission()).resolves.toBe(false);

		mockCameraRequest.mockRejectedValue(new Error('denied'));
		await expect(requestCameraPermission()).resolves.toBe(false);
	});
});

describe('requestMicrophonePermission', () => {
	beforeEach(() => {
		mockIsNativeApp.mockReturnValue(true);
		mockVoiceHas.mockReset();
		mockVoiceRequest.mockReset();
	});

	it('returns true on web without calling VoiceRecorder', async () => {
		mockIsNativeApp.mockReturnValue(false);

		await expect(requestMicrophonePermission()).resolves.toBe(true);
		expect(mockVoiceHas).not.toHaveBeenCalled();
	});

	it('returns true when permission already granted', async () => {
		mockVoiceHas.mockResolvedValue({ value: true });

		await expect(requestMicrophonePermission()).resolves.toBe(true);
		expect(mockVoiceRequest).not.toHaveBeenCalled();
	});

	it('requests permission when not yet granted', async () => {
		mockVoiceHas.mockResolvedValue({ value: false });
		mockVoiceRequest.mockResolvedValue({ value: true });

		await expect(requestMicrophonePermission()).resolves.toBe(true);
		expect(mockVoiceRequest).toHaveBeenCalled();
	});

	it('returns false when request fails', async () => {
		mockVoiceHas.mockResolvedValue({ value: false });
		mockVoiceRequest.mockResolvedValue({ value: false });

		await expect(requestMicrophonePermission()).resolves.toBe(false);
	});
});

describe('requestCompassPermission', () => {
	afterEach(() => {
		mockFusedHeading.mockReset();
	});

	it('delegates to requestFusedHeadingPermission', async () => {
		mockFusedHeading.mockResolvedValue(true);

		await expect(requestCompassPermission()).resolves.toBe(true);
		expect(mockFusedHeading).toHaveBeenCalled();
	});
});

describe('requestNotificationPermission', () => {
	beforeEach(() => {
		mockIsNativeApp.mockReturnValue(true);
		mockNotifCheck.mockReset();
		mockNotifRequest.mockReset();
	});

	it('returns true on web without calling the plugin', async () => {
		mockIsNativeApp.mockReturnValue(false);

		await expect(requestNotificationPermission()).resolves.toBe(true);
		expect(mockNotifCheck).not.toHaveBeenCalled();
		expect(mockNotifRequest).not.toHaveBeenCalled();
	});

	it('returns true when already granted', async () => {
		mockNotifCheck.mockResolvedValue({ display: 'granted' });

		await expect(requestNotificationPermission()).resolves.toBe(true);
		expect(mockNotifRequest).not.toHaveBeenCalled();
	});

	it('returns true when the prompt is granted', async () => {
		mockNotifCheck.mockResolvedValue({ display: 'prompt' });
		mockNotifRequest.mockResolvedValue({ display: 'granted' });

		await expect(requestNotificationPermission()).resolves.toBe(true);
		expect(mockNotifRequest).toHaveBeenCalled();
	});

	it('returns false when denied or the request fails', async () => {
		mockNotifCheck.mockResolvedValue({ display: 'prompt' });
		mockNotifRequest.mockResolvedValue({ display: 'denied' });
		await expect(requestNotificationPermission()).resolves.toBe(false);

		mockNotifCheck.mockRejectedValue(new Error('plugin_error'));
		await expect(requestNotificationPermission()).resolves.toBe(false);
	});
});

describe('hasNotificationPermission', () => {
	beforeEach(() => {
		mockIsNativeApp.mockReturnValue(true);
		mockNotifCheck.mockReset();
		mockNotifRequest.mockReset();
	});

	it('returns false on web without calling the plugin', async () => {
		mockIsNativeApp.mockReturnValue(false);

		await expect(hasNotificationPermission()).resolves.toBe(false);
		expect(mockNotifCheck).not.toHaveBeenCalled();
		expect(mockNotifRequest).not.toHaveBeenCalled();
	});

	it('returns true when already granted without prompting', async () => {
		mockNotifCheck.mockResolvedValue({ display: 'granted' });

		await expect(hasNotificationPermission()).resolves.toBe(true);
		expect(mockNotifRequest).not.toHaveBeenCalled();
	});

	it('returns false when not granted and does not prompt', async () => {
		mockNotifCheck.mockResolvedValue({ display: 'prompt' });

		await expect(hasNotificationPermission()).resolves.toBe(false);
		expect(mockNotifRequest).not.toHaveBeenCalled();
	});
});
