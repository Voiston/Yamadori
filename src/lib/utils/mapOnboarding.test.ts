import { describe, expect, it } from 'vitest';
import { MAP_ONBOARDING_STEPS } from './mapOnboarding';

describe('MAP_ONBOARDING_STEPS', () => {
	it('is a two-step menu then follow coach mark', () => {
		expect(MAP_ONBOARDING_STEPS).toEqual(['menu', 'follow']);
	});
});
