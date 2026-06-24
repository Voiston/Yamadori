import { describe, expect, it } from 'vitest';
import { smoothLocationReading } from '$lib/utils/locationSmoothing';
import type { LocationReading } from '$lib/utils/locationProvider';

function reading(
	overrides: Partial<LocationReading> & Pick<LocationReading, 'latitude' | 'longitude'>
): LocationReading {
	return {
		accuracyMeters: 30,
		altitudeMeters: null,
		heading: null,
		speedMps: null,
		timestamp: Date.now(),
		...overrides
	};
}

describe('smoothLocationReading', () => {
	it('returns the incoming reading when accuracy is good', () => {
		const incoming = reading({ latitude: 48.1, longitude: 2.3, accuracyMeters: 8 });
		expect(smoothLocationReading(null, incoming)).toEqual(incoming);
	});

	it('smooths noisy readings when accuracy is poor', () => {
		const previous = reading({ latitude: 48.0, longitude: 2.0, accuracyMeters: 40 });
		const incoming = reading({ latitude: 48.1, longitude: 2.1, accuracyMeters: 40 });
		const smoothed = smoothLocationReading(previous, incoming);

		expect(smoothed.latitude).toBeGreaterThan(48.0);
		expect(smoothed.latitude).toBeLessThan(48.1);
		expect(smoothed.longitude).toBeGreaterThan(2.0);
		expect(smoothed.longitude).toBeLessThan(2.1);
	});
});
