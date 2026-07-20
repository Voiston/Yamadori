import { describe, expect, it } from 'vitest';
import {
	getGpsFixOptions,
	getGpsOptions,
	GPS_CAPTURE_FIX_OPTIONS,
	GPS_CAPTURE_WATCH_OPTIONS,
	regionalApiCoordinates
} from './geo';

describe('regionalApiCoordinates', () => {
	it('truncates positive coordinates to 2 decimal places', () => {
		expect(regionalApiCoordinates(47.459, 2.349)).toEqual({
			latitude: 47.45,
			longitude: 2.34
		});
	});

	it('truncates negative coordinates toward zero', () => {
		expect(regionalApiCoordinates(47.269, -1.529)).toEqual({
			latitude: 47.26,
			longitude: -1.52
		});
	});

	it('leaves already-aligned coordinates unchanged', () => {
		expect(regionalApiCoordinates(48.85, 2.35)).toEqual({
			latitude: 48.85,
			longitude: 2.35
		});
	});
});

describe('capture gps options', () => {
	it('uses a short cache for live watch but not for save fixes', () => {
		expect(getGpsOptions('capture')).toEqual(GPS_CAPTURE_WATCH_OPTIONS);
		expect(getGpsFixOptions('capture')).toEqual(GPS_CAPTURE_FIX_OPTIONS);
		expect(GPS_CAPTURE_WATCH_OPTIONS.maximumAge).toBeGreaterThan(0);
		expect(GPS_CAPTURE_FIX_OPTIONS.maximumAge).toBe(0);
	});
});
