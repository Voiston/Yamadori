import { describe, expect, it } from 'vitest';
import {
	isMonthInInclusiveWindow,
	monthsOutsideInclusiveWindow,
	resolveHarvestCalendarPrior,
	resolveMacroRegionAt
} from '$lib/geo/harvestWindowPrior';
import { getGddSeasonStartDate } from '$lib/utils/openMeteoArchive';

describe('getGddSeasonStartDate', () => {
	it('uses January 1 in the northern hemisphere', () => {
		expect(getGddSeasonStartDate(new Date('2026-03-15T12:00:00'), 47.2)).toBe('2026-01-01');
		expect(getGddSeasonStartDate(new Date('2026-08-15T12:00:00'), 47.2)).toBe('2026-01-01');
	});

	it('uses July 1 agro-year in the southern hemisphere', () => {
		expect(getGddSeasonStartDate(new Date('2026-08-15T12:00:00'), -33.87)).toBe('2026-07-01');
		expect(getGddSeasonStartDate(new Date('2026-03-15T12:00:00'), -33.87)).toBe('2025-07-01');
		expect(getGddSeasonStartDate(new Date('2026-08-15T12:00:00'), -36.85)).toBe('2026-07-01');
	});
});

describe('isMonthInInclusiveWindow', () => {
	it('handles non-wrapping and wrapping ranges', () => {
		expect(isMonthInInclusiveWindow(7, 6, 8)).toBe(true);
		expect(isMonthInInclusiveWindow(1, 6, 8)).toBe(false);
		expect(isMonthInInclusiveWindow(12, 11, 3)).toBe(true);
		expect(isMonthInInclusiveWindow(2, 11, 3)).toBe(true);
		expect(isMonthInInclusiveWindow(6, 11, 3)).toBe(false);
	});
});

describe('resolveHarvestCalendarPrior', () => {
	it('marks AU Banksia in NSW as in-window during winter', () => {
		const prior = resolveHarvestCalendarPrior(
			'Banksia',
			-33.87,
			151.21,
			new Date('2026-07-15T12:00:00')
		);
		expect(resolveMacroRegionAt(-33.87, 151.21, 'au_')).toBe('au_nsw');
		expect(prior).toEqual({ applicable: true, inWindow: true, monthsFromWindow: 0 });
	});

	it('marks AU Banksia in NSW as outside window in summer', () => {
		const prior = resolveHarvestCalendarPrior(
			'Banksia',
			-33.87,
			151.21,
			new Date('2026-01-15T12:00:00')
		);
		expect(prior.applicable).toBe(true);
		expect(prior.inWindow).toBe(false);
		expect(prior.monthsFromWindow).toBeGreaterThan(0);
	});

	it('does not apply when species has no calendar entry', () => {
		expect(
			resolveHarvestCalendarPrior('Unknown shrub', -33.87, 151.21, new Date('2026-01-15'))
		).toEqual({ applicable: false, inWindow: true, monthsFromWindow: 0 });
	});
});

describe('monthsOutsideInclusiveWindow', () => {
	it('returns 0 inside window and positive distance outside', () => {
		expect(monthsOutsideInclusiveWindow(7, 6, 8)).toBe(0);
		expect(monthsOutsideInclusiveWindow(1, 6, 8)).toBeGreaterThan(0);
		expect(monthsOutsideInclusiveWindow(1, 11, 3)).toBe(0);
	});
});
