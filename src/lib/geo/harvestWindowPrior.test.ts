import { describe, expect, it } from 'vitest';
import {
	harvestWindowNotifyPlan,
	isMonthInInclusiveWindow,
	monthsOutsideInclusiveWindow,
	nextHarvestWindowStartDate,
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

describe('nextHarvestWindowStartDate', () => {
	it('returns the next 1st of the start month at 08:00', () => {
		const at = nextHarvestWindowStartDate(
			'Banksia',
			-33.87,
			151.21,
			new Date(2026, 0, 15, 12, 0, 0)
		);
		expect(at?.getTime()).toBe(new Date(2026, 5, 1, 8, 0, 0, 0).getTime());
	});

	it('rolls to next year when this year’s start has passed', () => {
		const at = nextHarvestWindowStartDate(
			'Banksia',
			-33.87,
			151.21,
			new Date(2026, 6, 15, 12, 0, 0)
		);
		expect(at?.getTime()).toBe(new Date(2027, 5, 1, 8, 0, 0, 0).getTime());
	});

	it('returns null when no calendar applies', () => {
		expect(
			nextHarvestWindowStartDate('Unknown shrub', -33.87, 151.21, new Date(2026, 0, 15))
		).toBeNull();
	});
});

describe('harvestWindowNotifyPlan', () => {
	it('is unavailable without GPS or a matching species', () => {
		expect(harvestWindowNotifyPlan('Banksia', null, null)).toEqual({ status: 'unavailable' });
		expect(
			harvestWindowNotifyPlan('Unknown shrub', -33.87, 151.21, new Date(2026, 0, 15))
		).toEqual({ status: 'unavailable' });
	});

	it('is open during the harvest months', () => {
		expect(
			harvestWindowNotifyPlan('Banksia', -33.87, 151.21, new Date(2026, 6, 15, 12, 0, 0))
		).toEqual({ status: 'open' });
	});

	it('is upcoming before the harvest months', () => {
		const plan = harvestWindowNotifyPlan(
			'Banksia',
			-33.87,
			151.21,
			new Date(2026, 0, 15, 12, 0, 0)
		);
		expect(plan.status).toBe('upcoming');
		if (plan.status === 'upcoming') {
			expect(plan.at.getTime()).toBe(new Date(2026, 5, 1, 8, 0, 0, 0).getTime());
		}
	});
});

describe('monthsOutsideInclusiveWindow', () => {
	it('returns 0 inside window and positive distance outside', () => {
		expect(monthsOutsideInclusiveWindow(7, 6, 8)).toBe(0);
		expect(monthsOutsideInclusiveWindow(1, 6, 8)).toBeGreaterThan(0);
		expect(monthsOutsideInclusiveWindow(1, 11, 3)).toBe(0);
	});
});
