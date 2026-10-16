import { describe, expect, it } from 'vitest';
import { DEFAULT_ENVIRONMENT_EXPOSURE } from '$lib/types/environment';
import { DEFAULT_ASSESSMENT, type Tree } from '$lib/types/tree';
import {
	evaluateWeekWindow,
	isVisitStale,
	lastActivityAt,
	mergeWeekWindowWithRevisits,
	plantInputsFromTree,
	sortWeekWindowEntries,
	STALE_VISIT_MS,
	earliestWindowNotifyAt,
	nextYrsNotifyAt,
	weekWindowTreesSignature,
	weeksSince
} from './weekWindow';

const NOW = new Date('2026-08-16T12:00:00.000Z');

function daysAgoIso(days: number): string {
	return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('isVisitStale', () => {
	it('treats activity older than 6 weeks as stale', () => {
		expect(isVisitStale(daysAgoIso(43), NOW)).toBe(true);
		expect(isVisitStale(daysAgoIso(41), NOW)).toBe(false);
	});

	it('treats invalid dates as stale', () => {
		expect(isVisitStale('not-a-date', NOW)).toBe(true);
	});
});

describe('weeksSince', () => {
	it('floors elapsed weeks', () => {
		expect(weeksSince(daysAgoIso(13), NOW)).toBe(1);
		expect(weeksSince(daysAgoIso(6), NOW)).toBe(0);
	});
});

describe('lastActivityAt', () => {
	it('prefers the latest visit over capturedAt', () => {
		expect(
			lastActivityAt({
				capturedAt: '2026-01-01T00:00:00.000Z',
				visits: [
					{
						id: 'v1',
						visitedAt: '2026-03-01T00:00:00.000Z',
						note: '',
						photos: []
					},
					{
						id: 'v2',
						visitedAt: '2026-04-01T00:00:00.000Z',
						note: '',
						photos: []
					}
				]
			})
		).toBe('2026-04-01T00:00:00.000Z');
	});

	it('falls back to capturedAt when there are no visits', () => {
		expect(lastActivityAt({ capturedAt: '2026-01-01T00:00:00.000Z', visits: [] })).toBe(
			'2026-01-01T00:00:00.000Z'
		);
	});
});

describe('plantInputsFromTree', () => {
	it('copies assessment and exposure fields', () => {
		const tree = {
			species: 'Fagus sylvatica',
			assessment: {
				...DEFAULT_ASSESSMENT,
				observedPhenologyStage: 'dormance' as const,
				cernageStatus: 'partial' as const
			},
			environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE
		};
		expect(plantInputsFromTree(tree as Pick<Tree, 'species' | 'assessment' | 'environmentExposure'>)).toEqual(
			{
				species: 'Fagus sylvatica',
				observedPhenologyStage: 'dormance',
				cernageStatus: 'partial',
				aoutementStatus: null,
				leafFallPct: null,
				environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE
			}
		);
	});
});

describe('evaluateWeekWindow', () => {
	const base = {
		treeId: 't1',
		hasGps: true,
		simpleMode: false,
		inCalendar: false,
		lastActivityAt: daysAgoIso(50),
		now: NOW
	};

	it('excludes trees without GPS', () => {
		expect(
			evaluateWeekWindow({
				...base,
				hasGps: false,
				decision: 'OPTIMAL',
				inCalendar: true
			})
		).toBeNull();
	});

	it('includes a recent OPTIMAL tree', () => {
		const entry = evaluateWeekWindow({
			...base,
			decision: 'OPTIMAL',
			lastActivityAt: daysAgoIso(3)
		});
		expect(entry).toMatchObject({
			treeId: 't1',
			rank: 'optimal',
			decision: 'OPTIMAL',
			stale: false
		});
	});

	it('excludes a fresh ACCEPTABLE tree', () => {
		expect(
			evaluateWeekWindow({
				...base,
				decision: 'ACCEPTABLE',
				lastActivityAt: daysAgoIso(3)
			})
		).toBeNull();
	});

	it('includes a stale ACCEPTABLE tree', () => {
		const entry = evaluateWeekWindow({
			...base,
			decision: 'ACCEPTABLE'
		});
		expect(entry?.rank).toBe('acceptable');
		expect(entry?.stale).toBe(true);
	});

	it('includes a stale calendar-only tree', () => {
		const entry = evaluateWeekWindow({
			...base,
			decision: null,
			inCalendar: true
		});
		expect(entry?.rank).toBe('calendar');
		expect(entry?.decision).toBeNull();
	});

	it('excludes trees with neither YRS window nor calendar', () => {
		expect(
			evaluateWeekWindow({
				...base,
				decision: 'RISK',
				inCalendar: false
			})
		).toBeNull();
	});

	it('ignores YRS in simple mode and uses the calendar', () => {
		expect(
			evaluateWeekWindow({
				...base,
				simpleMode: true,
				decision: 'OPTIMAL',
				inCalendar: false,
				lastActivityAt: daysAgoIso(3)
			})
		).toBeNull();

		const entry = evaluateWeekWindow({
			...base,
			simpleMode: true,
			decision: 'OPTIMAL',
			inCalendar: true
		});
		expect(entry).toMatchObject({ rank: 'calendar', decision: null, stale: true });
	});
});

describe('sortWeekWindowEntries', () => {
	it('orders OPTIMAL then ACCEPTABLE then calendar, older first', () => {
		const sorted = sortWeekWindowEntries([
			{
				treeId: 'cal-new',
				rank: 'calendar',
				decision: null,
				inCalendar: true,
				lastVisitAt: daysAgoIso(50),
				stale: true
			},
			{
				treeId: 'opt-old',
				rank: 'optimal',
				decision: 'OPTIMAL',
				inCalendar: false,
				lastVisitAt: daysAgoIso(80),
				stale: true
			},
			{
				treeId: 'opt-new',
				rank: 'optimal',
				decision: 'OPTIMAL',
				inCalendar: false,
				lastVisitAt: daysAgoIso(10),
				stale: false
			},
			{
				treeId: 'acc',
				rank: 'acceptable',
				decision: 'ACCEPTABLE',
				inCalendar: false,
				lastVisitAt: daysAgoIso(60),
				stale: true
			}
		]);
		expect(sorted.map((entry) => entry.treeId)).toEqual([
			'opt-old',
			'opt-new',
			'acc',
			'cal-new'
		]);
	});

	it('places due revisits before harvest ranks', () => {
		const sorted = sortWeekWindowEntries([
			{
				treeId: 'opt',
				rank: 'optimal',
				decision: 'OPTIMAL',
				inCalendar: false,
				lastVisitAt: daysAgoIso(10),
				stale: false
			},
			{
				treeId: 'due',
				rank: 'revisit',
				decision: null,
				inCalendar: false,
				lastVisitAt: daysAgoIso(20),
				stale: true
			}
		]);
		expect(sorted.map((entry) => entry.treeId)).toEqual(['due', 'opt']);
	});
});

describe('STALE_VISIT_MS', () => {
	it('is six weeks', () => {
		expect(STALE_VISIT_MS).toBe(6 * 7 * 24 * 60 * 60 * 1000);
	});
});

describe('mergeWeekWindowWithRevisits', () => {
	it('adds due trees that are not already in the harvest window', () => {
		const harvest = [
			{
				treeId: 'opt',
				rank: 'optimal' as const,
				decision: 'OPTIMAL' as const,
				inCalendar: false,
				lastVisitAt: daysAgoIso(10),
				stale: false
			}
		];
		const merged = mergeWeekWindowWithRevisits(
			harvest,
			[
				{
					id: 'opt',
					nextRevisitAt: '2026-08-16',
					capturedAt: daysAgoIso(10),
					visits: []
				},
				{
					id: 'due-only',
					nextRevisitAt: '2026-08-10',
					capturedAt: daysAgoIso(80),
					visits: []
				},
				{
					id: 'future',
					nextRevisitAt: '2026-09-01',
					capturedAt: daysAgoIso(80),
					visits: []
				}
			],
			NOW
		);
		expect(merged.map((entry) => entry.treeId)).toEqual(['due-only', 'opt']);
		expect(merged[0]?.rank).toBe('revisit');
		expect(merged[1]?.rank).toBe('optimal');
	});
});

describe('weekWindowTreesSignature', () => {
	it('changes when the local calendar day changes', () => {
		const trees: Pick<
			Tree,
			| 'id'
			| 'capturedAt'
			| 'visits'
			| 'species'
			| 'latitude'
			| 'longitude'
			| 'assessment'
			| 'environmentExposure'
			| 'nextRevisitAt'
		>[] = [
			{
				id: 't1',
				capturedAt: '2026-01-01',
				visits: [],
				species: 'Pin',
				latitude: 48.8,
				longitude: 2.3,
				assessment: { ...DEFAULT_ASSESSMENT },
				environmentExposure: DEFAULT_ENVIRONMENT_EXPOSURE,
				nextRevisitAt: null
			}
		];
		const day1 = weekWindowTreesSignature(trees, false, true, new Date(2026, 8, 4, 10, 0, 0));
		const day2 = weekWindowTreesSignature(trees, false, true, new Date(2026, 8, 5, 10, 0, 0));
		expect(day1).not.toBe(day2);
		expect(day1.startsWith('2026-09-04|')).toBe(true);
		expect(day2.startsWith('2026-09-05|')).toBe(true);
	});
});

describe('nextYrsNotifyAt', () => {
	it('returns 08:00 on the first future ACCEPTABLE day', () => {
		const now = new Date(2026, 8, 4, 10, 0, 0);
		const at = nextYrsNotifyAt(
			[
				{ date: '2026-09-04', yrsDecision: 'RISK' },
				{ date: '2026-09-06', yrsDecision: 'ACCEPTABLE' }
			],
			now
		);
		expect(at?.getTime()).toBe(new Date(2026, 8, 6, 8, 0, 0, 0).getTime());
	});

	it('returns null when no day is OPTIMAL or ACCEPTABLE', () => {
		expect(
			nextYrsNotifyAt(
				[
					{ date: '2026-09-04', yrsDecision: 'RISK' },
					{ date: '2026-09-05', yrsDecision: 'NO_GO' }
				],
				new Date(2026, 8, 4, 10, 0, 0)
			)
		).toBeNull();
	});

	it('skips today when already past 08:00 even if OPTIMAL', () => {
		const now = new Date(2026, 8, 4, 10, 0, 0);
		const at = nextYrsNotifyAt(
			[
				{ date: '2026-09-04', yrsDecision: 'OPTIMAL' },
				{ date: '2026-09-05', yrsDecision: 'OPTIMAL' }
			],
			now
		);
		expect(at?.getTime()).toBe(new Date(2026, 8, 5, 8, 0, 0, 0).getTime());
	});
});

describe('earliestWindowNotifyAt', () => {
	it('picks the sooner of calendar and YRS', () => {
		const yrs = new Date(2026, 8, 8, 8, 0, 0, 0);
		const calendar = new Date(2026, 10, 1, 8, 0, 0, 0);
		expect(earliestWindowNotifyAt(calendar, yrs)?.getTime()).toBe(yrs.getTime());
		expect(earliestWindowNotifyAt(calendar, null)?.getTime()).toBe(calendar.getTime());
		expect(earliestWindowNotifyAt(null, yrs)?.getTime()).toBe(yrs.getTime());
		expect(earliestWindowNotifyAt(null, null)).toBeNull();
	});
});
