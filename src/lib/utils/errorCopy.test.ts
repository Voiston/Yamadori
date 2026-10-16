import { describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import { formatErrorToast } from '$lib/utils/userFacingError';

vi.mock('$lib/utils/platform', () => ({
	isNativeApp: () => false
}));

import {
	compassParkingEmptyCopy,
	compassTreeMissingCopy,
	locationDeniedCopy
} from './errorCopy';

describe('locationDeniedCopy', () => {
	it('keeps generic GPS copy free of YRS', () => {
		const copy = locationDeniedCopy();
		expect(copy.what).toBe(m.location_denied_what());
		expect(copy.why).toBe(m.location_denied_why());
		expect(`${copy.what} ${copy.why}`.toLowerCase()).not.toContain('yrs');
	});

	it('adds YRS context only when requested', () => {
		const copy = locationDeniedCopy({ yrs: true });
		expect(copy.why).toBeDefined();
		expect(copy.why).toBe(m.location_denied_yrs_why());
		expect(copy.why?.toLowerCase()).toContain('yrs');
	});
});

describe('compass empty copies', () => {
	it('sends parking compass empty state to the map', () => {
		const copy = compassParkingEmptyCopy();
		expect(copy.what).toBe(m.compass_parking_empty_what());
		expect(copy.action.kind).toBe('link');
		expect(copy.action.href).toBe('/map');
	});

	it('sends missing-tree compass state home', () => {
		const copy = compassTreeMissingCopy();
		expect(copy.what).toBe(m.compass_tree_missing_what());
		expect(copy.action.kind).toBe('link');
		expect(copy.action.href).toBe('/');
	});
});

describe('error toast density', () => {
	it('formats GPS denial as What — Action', () => {
		const copy = locationDeniedCopy();
		const message = formatErrorToast(copy);
		expect(message).toContain(copy.what);
		expect(message).toContain('—');
		expect(message).toContain(copy.action.label);
	});
});
