import { describe, expect, it } from 'vitest';
import {
	COMPASS_POSITION_EPSILON_M,
	shouldUpdateCompassPosition
} from '$lib/utils/compassPosition';

describe('shouldUpdateCompassPosition', () => {
	it('returns true when there is no anchor', () => {
		expect(
			shouldUpdateCompassPosition(null, { latitude: 48.1, longitude: 2.3 })
		).toBe(true);
	});

	it('returns false when movement is below epsilon', () => {
		const anchor = { latitude: 48.1, longitude: 2.3 };
		expect(
			shouldUpdateCompassPosition(anchor, { latitude: 48.10001, longitude: 2.30001 })
		).toBe(false);
	});

	it('returns true when movement meets epsilon', () => {
		const anchor = { latitude: 48.1, longitude: 2.3 };
		expect(
			shouldUpdateCompassPosition(
				anchor,
				{ latitude: 48.10003, longitude: 2.3 },
				COMPASS_POSITION_EPSILON_M
			)
		).toBe(true);
	});
});
