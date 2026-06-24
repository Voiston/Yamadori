import { describe, expect, it } from 'vitest';
import {
	getGpsCaptureReadyHint,
	getGpsCaptureTips,
	getGpsCaptureWaitingHint
} from './gps-capture';

describe('gps-capture hints', () => {
	it('mentions offline mountain cold start', () => {
		expect(getGpsCaptureWaitingHint(false)).toMatch(/Hors-ligne/i);
	});

	it('recommends excellent accuracy when ready', () => {
		expect(getGpsCaptureReadyHint(true, 8)).toMatch(/excellente/i);
	});

	it('includes precise permission tip', () => {
		expect(getGpsCaptureTips().some((tip) => tip.includes('Précise'))).toBe(true);
	});
});
