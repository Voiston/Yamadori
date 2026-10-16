import { resolveHarvestCalendarPrior } from '$lib/geo/harvestWindowPrior';
import { getLastVisitAt, type Tree } from '$lib/types/tree';
import type { YrsDecision, YrsPlantInputs } from '$lib/types/yrs';
import type { ViabilityDay } from '$lib/types/agri';
import { isRevisitDue, localDateString, revisitAtLocalEight } from '$lib/utils/revisit';

/** Trees not visited for this long count as stale for the weekly window. */
export const STALE_VISIT_MS = 6 * 7 * 24 * 60 * 60 * 1000;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const WEEK_WINDOW_PREVIEW_LIMIT = 5;

export type WeekWindowRank = 'revisit' | 'optimal' | 'acceptable' | 'calendar';

export type WeekWindowEntry = {
	treeId: string;
	rank: WeekWindowRank;
	decision: YrsDecision | null;
	inCalendar: boolean;
	lastVisitAt: string;
	stale: boolean;
};

export type WeekWindowInput = {
	treeId: string;
	hasGps: boolean;
	simpleMode: boolean;
	decision: YrsDecision | null;
	inCalendar: boolean;
	lastActivityAt: string;
	now?: Date;
};

const RANK_ORDER: Record<WeekWindowRank, number> = {
	revisit: 0,
	optimal: 1,
	acceptable: 2,
	calendar: 3
};

export function plantInputsFromTree(
	tree: Pick<Tree, 'species' | 'assessment' | 'environmentExposure'>
): YrsPlantInputs {
	return {
		species: tree.species,
		observedPhenologyStage: tree.assessment.observedPhenologyStage,
		cernageStatus: tree.assessment.cernageStatus,
		aoutementStatus: tree.assessment.aoutementStatus,
		leafFallPct: tree.assessment.leafFallPct,
		environmentExposure: tree.environmentExposure
	};
}

export function lastActivityAt(tree: Pick<Tree, 'visits' | 'capturedAt'>): string {
	return getLastVisitAt(tree as Tree) ?? tree.capturedAt;
}

export function isVisitStale(iso: string, now = new Date()): boolean {
	const timestamp = Date.parse(iso);
	if (Number.isNaN(timestamp)) return true;
	return now.getTime() - timestamp >= STALE_VISIT_MS;
}

export function weeksSince(iso: string, now = new Date()): number {
	const timestamp = Date.parse(iso);
	if (Number.isNaN(timestamp)) return 0;
	return Math.max(0, Math.floor((now.getTime() - timestamp) / WEEK_MS));
}

export function treeHarvestInWindow(
	tree: Pick<Tree, 'species' | 'latitude' | 'longitude'>,
	now = new Date()
): boolean {
	if (tree.latitude === null || tree.longitude === null) return false;
	const prior = resolveHarvestCalendarPrior(tree.species, tree.latitude, tree.longitude, now);
	return prior.applicable && prior.inWindow;
}

export function evaluateWeekWindow(input: WeekWindowInput): WeekWindowEntry | null {
	if (!input.hasGps) return null;

	const now = input.now ?? new Date();
	const stale = isVisitStale(input.lastActivityAt, now);
	const decision = input.simpleMode ? null : input.decision;
	const yrsOpen = decision === 'OPTIMAL' || decision === 'ACCEPTABLE';

	if (!yrsOpen && !input.inCalendar) return null;
	if (!stale && decision !== 'OPTIMAL') return null;

	const rank: WeekWindowRank =
		decision === 'OPTIMAL' ? 'optimal' : decision === 'ACCEPTABLE' ? 'acceptable' : 'calendar';

	return {
		treeId: input.treeId,
		rank,
		decision,
		inCalendar: input.inCalendar,
		lastVisitAt: input.lastActivityAt,
		stale
	};
}

export function isHarvestWindowRank(rank: WeekWindowRank | undefined): boolean {
	return rank === 'optimal' || rank === 'acceptable' || rank === 'calendar';
}

export function mergeWeekWindowWithRevisits(
	harvestEntries: WeekWindowEntry[],
	trees: Pick<Tree, 'id' | 'nextRevisitAt' | 'visits' | 'capturedAt'>[],
	now = new Date()
): WeekWindowEntry[] {
	const byId = new Map(harvestEntries.map((entry) => [entry.treeId, entry]));
	for (const tree of trees) {
		if (byId.has(tree.id)) continue;
		if (!isRevisitDue(tree.nextRevisitAt, now)) continue;
		const activityAt = lastActivityAt(tree);
		byId.set(tree.id, {
			treeId: tree.id,
			rank: 'revisit',
			decision: null,
			inCalendar: false,
			lastVisitAt: activityAt,
			stale: isVisitStale(activityAt, now)
		});
	}
	return sortWeekWindowEntries([...byId.values()]);
}

export function compareWeekWindowEntries(a: WeekWindowEntry, b: WeekWindowEntry): number {
	const rankDiff = RANK_ORDER[a.rank] - RANK_ORDER[b.rank];
	if (rankDiff !== 0) return rankDiff;
	return a.lastVisitAt.localeCompare(b.lastVisitAt);
}

export function sortWeekWindowEntries(entries: WeekWindowEntry[]): WeekWindowEntry[] {
	return [...entries].sort(compareWeekWindowEntries);
}

export function weekWindowTreesSignature(
	trees: Pick<
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
	>[],
	simpleMode: boolean,
	online: boolean,
	now = new Date()
): string {
	return `${localDateString(now)}|${simpleMode ? '1' : '0'}|${online ? '1' : '0'}|${trees
		.map(
			(tree) =>
				`${tree.id}:${tree.capturedAt}:${tree.visits.length}:${tree.species}:${tree.latitude}:${tree.longitude}:${tree.assessment.observedPhenologyStage}:${tree.environmentExposure}:${tree.nextRevisitAt ?? ''}`
		)
		.join(',')}`;
}

export function isYrsNotifyDecision(decision: YrsDecision | null | undefined): boolean {
	return decision === 'OPTIMAL' || decision === 'ACCEPTABLE';
}

/** First forecast day still in the future at local 08:00 with OPTIMAL/ACCEPTABLE YRS. */
export function nextYrsNotifyAt(
	days: Pick<ViabilityDay, 'date' | 'yrsDecision'>[] | null | undefined,
	now = new Date()
): Date | null {
	if (!days?.length) return null;
	for (const day of days) {
		if (!isYrsNotifyDecision(day.yrsDecision)) continue;
		const at = revisitAtLocalEight(day.date);
		if (at && at.getTime() > now.getTime()) return at;
	}
	return null;
}

export function earliestWindowNotifyAt(calendarAt: Date | null, yrsAt: Date | null): Date | null {
	if (!calendarAt) return yrsAt;
	if (!yrsAt) return calendarAt;
	return calendarAt.getTime() <= yrsAt.getTime() ? calendarAt : yrsAt;
}
