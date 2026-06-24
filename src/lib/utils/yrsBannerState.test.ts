import { describe, expect, it } from 'vitest';
import { resolveYrsBannerDisplayState } from './yrsBannerState';

const base = {
	yrs: null,
	loading: false,
	gpsReady: true,
	online: true,
	fromCache: false,
	locationError: ''
};

describe('resolveYrsBannerDisplayState', () => {
	it('shows pending offline when GPS is ready but network and cache are unavailable', () => {
		expect(
			resolveYrsBannerDisplayState({
				...base,
				online: false,
				fromCache: false
			})
		).toBe('pending_offline');
	});

	it('shows GPS required when permission is denied', () => {
		expect(
			resolveYrsBannerDisplayState({
				...base,
				gpsReady: false,
				locationError: 'GPS requis pour le YRS'
			})
		).toBe('gps_required');
	});

	it('shows score when YRS data is available', () => {
		expect(
			resolveYrsBannerDisplayState({
				...base,
				yrs: {
					score: 80,
					decision: 'OPTIMAL',
					layers: {
						climate: 20,
						soil: 20,
						phenology: 20,
						hydric: 20,
						stressPenalty: 0
					},
					summary: 'ok'
				}
			})
		).toBe('score');
	});
});
