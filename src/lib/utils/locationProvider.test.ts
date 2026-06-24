import { describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import {
	geolocationErrorMessage,
	locationPermissionErrorMessage
} from './locationProvider';

describe('locationPermissionErrorMessage', () => {
	it('mentions YRS when location is denied', () => {
		const message = locationPermissionErrorMessage('denied');
		expect(message).toBe(m.location_denied_yrs_required());
		expect(message.toLowerCase()).toContain('yrs');
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
