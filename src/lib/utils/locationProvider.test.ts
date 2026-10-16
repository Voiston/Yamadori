import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import { formatErrorToast } from '$lib/utils/userFacingError';
import { locationDeniedCopy } from '$lib/utils/errorCopy';

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
	it('does not mention YRS on generic denial', () => {
		const message = locationPermissionErrorMessage('denied');
		expect(message).toBe(formatErrorToast(locationDeniedCopy()));
		expect(message.toLowerCase()).not.toContain('yrs');
	});

	it('uses the same generic denial copy when permission is still promptable', () => {
		expect(locationPermissionErrorMessage('prompt')).toBe(formatErrorToast(locationDeniedCopy()));
	});
});

describe('geolocationErrorMessage', () => {
	it('maps browser permission denial to a generic location copy', () => {
		const message = geolocationErrorMessage({ code: 1, message: 'User denied Geolocation' });
		expect(message).toBe(formatErrorToast(locationDeniedCopy()));
		expect(message.toLowerCase()).not.toContain('yrs');
	});

	it('maps timeout and other failures to the unavailable copy', () => {
		expect(geolocationErrorMessage(new Error('Timeout'))).toContain(m.location_unavailable_what());
		expect(geolocationErrorMessage({ code: 3, message: 'Timeout' })).toContain(
			m.location_unavailable_what()
		);
		expect(geolocationErrorMessage({ code: 2, message: 'Position unavailable' })).toContain(
			m.location_unavailable_what()
		);
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
});
