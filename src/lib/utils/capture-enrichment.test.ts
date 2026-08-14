import { describe, expect, it } from 'vitest';
import {
	CAPTURE_AGRI_REFETCH_DISTANCE_M,
	capturePositionKey,
	shouldRefetchCapturePosition
} from '$lib/utils/capture-enrichment';

describe('capture-enrichment', () => {
	it('formats stable position keys', () => {
		expect(capturePositionKey(45.12349, 6.78951)).toBe('45.1235,6.7895');
	});

	it('refetches when anchor is missing', () => {
		expect(
			shouldRefetchCapturePosition(null, { latitude: 45.1, longitude: 6.7 }, 10)
		).toBe(true);
	});

	it('skips refetch when movement is below threshold', () => {
		expect(
			shouldRefetchCapturePosition(
				{ latitude: 45.1, longitude: 6.7 },
				{ latitude: 45.10001, longitude: 6.70001 },
				CAPTURE_AGRI_REFETCH_DISTANCE_M
			)
		).toBe(false);
	});
});
