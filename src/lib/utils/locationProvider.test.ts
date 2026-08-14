import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';

const { mockCheckPermissions, mockIsNativeApp } = vi.hoisted(() => ({
	mockCheckPermissions: vi.fn(),
	mockIsNativeApp: vi.fn()
}));

vi.mock('@capacitor/geolocation', () => ({
	Geolocation: {
		checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
		requestPermissions: vi.fn()
	}
}));

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: (...args: unknown[]) => mockIsNativeApp(...args)
}));

import {
	geolocationErrorMessage,
	getLocationPermissionStatus,
	locationPermissionErrorMessage
} from './locationProvider';

describe('locationPermissionErrorMessage', () => {
	it('mentions YRS when location is denied', () => {
		const message = locationPermissionErrorMessage('denied');
		expect(message).toBe(m.location_denied_yrs_required());
		expect(message.toLowerCase()).toContain('yrs');
	});

	it('uses the same message when permission is still promptable', () => {
		expect(locationPermissionErrorMessage('prompt')).toBe(m.location_denied_yrs_required());
	});
});

describe('geolocationErrorMessage', () => {
	it('maps browser permission denial to the YRS-required message', () => {
		const message = geolocationErrorMessage({ code: 1, message: 'User denied Geolocation' });
		expect(message).toBe(m.location_denied_yrs_required());
	});

	it('falls back to the error message for other geolocation failures', () => {
		expect(geolocationErrorMessage(new Error('Timeout'))).toBe('Timeout');
	});
});

describe('getLocationPermissionStatus', () => {
	beforeEach(() => {
		mockCheckPermissions.mockReset();
		mockIsNativeApp.mockReset();
		mockIsNativeApp.mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('maps Capacitor prompt states to prompt', async () => {
		mockCheckPermissions.mockResolvedValue({
			location: 'prompt',
			coarseLocation: 'prompt'
		});
		await expect(getLocationPermissionStatus()).resolves.toBe('prompt');

		mockCheckPermissions.mockResolvedValue({
			location: 'prompt-with-rationale',
			coarseLocation: 'denied'
		});
		await expect(getLocationPermissionStatus()).resolves.toBe('prompt');
	});

	it('maps permanent denial to denied', async () => {
		mockCheckPermissions.mockResolvedValue({
			location: 'denied',
			coarseLocation: 'denied'
		});
		await expect(getLocationPermissionStatus()).resolves.toBe('denied');
	});

	it('maps coarse-only grant', async () => {
		mockCheckPermissions.mockResolvedValue({
			location: 'denied',
			coarseLocation: 'granted'
		});
		await expect(getLocationPermissionStatus()).resolves.toBe('coarse-only');
	});
});
