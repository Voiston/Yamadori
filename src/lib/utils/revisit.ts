/** Local calendar date `YYYY-MM-DD`. */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const REVISIT_NOTIFY_HOUR = 8;

export type RevisitNotifyKind = 'date' | 'window';

export function localDateString(now = new Date()): string {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string | null | undefined): string | null {
	if (!value || !ISO_DATE_RE.test(value)) return null;
	return value;
}

export function normalizeRevisitFields(raw: {
	nextRevisitAt?: string | null;
	notifyOnWindow?: boolean;
	windowNotifyArmed?: boolean;
	dateNotifySentFor?: string | null;
}): {
	nextRevisitAt: string | null;
	notifyOnWindow: boolean;
	windowNotifyArmed: boolean;
	dateNotifySentFor: string | null;
} {
	const nextRevisitAt = parseIsoDate(raw.nextRevisitAt);
	const notifyOnWindow = raw.notifyOnWindow === true;
	const dateNotifySentFor = parseIsoDate(raw.dateNotifySentFor);
	return {
		nextRevisitAt,
		notifyOnWindow,
		windowNotifyArmed:
			raw.windowNotifyArmed === true || (raw.windowNotifyArmed == null && notifyOnWindow),
		dateNotifySentFor:
			dateNotifySentFor && dateNotifySentFor === nextRevisitAt ? dateNotifySentFor : null
	};
}

export function isRevisitDue(
	nextRevisitAt: string | null | undefined,
	now = new Date()
): boolean {
	const date = parseIsoDate(nextRevisitAt);
	if (!date) return false;
	return date <= localDateString(now);
}

const MS_PER_DAY = 86_400_000;

/** Whole local calendar days from today to `nextRevisitAt` (negative if past). */
export function calendarDaysUntil(
	nextRevisitAt: string | null | undefined,
	now = new Date()
): number | null {
	const date = parseIsoDate(nextRevisitAt);
	if (!date) return null;
	const today = localDateString(now);
	const [fromYear, fromMonth, fromDay] = today.split('-').map(Number);
	const [toYear, toMonth, toDay] = date.split('-').map(Number);
	if (
		fromYear === undefined ||
		fromMonth === undefined ||
		fromDay === undefined ||
		toYear === undefined ||
		toMonth === undefined ||
		toDay === undefined
	) {
		return null;
	}
	const from = new Date(fromYear, fromMonth - 1, fromDay).getTime();
	const to = new Date(toYear, toMonth - 1, toDay).getTime();
	return Math.round((to - from) / MS_PER_DAY);
}

export type RevisitDateStatus = 'none' | 'upcoming' | 'soon' | 'today' | 'overdue';

export function revisitDateStatus(
	nextRevisitAt: string | null | undefined,
	now = new Date()
): RevisitDateStatus {
	const date = parseIsoDate(nextRevisitAt);
	if (!date) return 'none';
	const today = localDateString(now);
	if (date < today) return 'overdue';
	if (date === today) return 'today';
	const days = calendarDaysUntil(date, now);
	if (days !== null && days < 7) return 'soon';
	return 'upcoming';
}

/** Local 08:00 on the given `YYYY-MM-DD`. */
export function revisitAtLocalEight(isoDate: string): Date | null {
	const date = parseIsoDate(isoDate);
	if (!date) return null;
	const [year, month, day] = date.split('-').map(Number);
	if (year === undefined || month === undefined || day === undefined) return null;
	return new Date(year, month - 1, day, REVISIT_NOTIFY_HOUR, 0, 0, 0);
}

/**
 * Stable Android notification id in `1..2^31-1`.
 * Kind namespaces date vs window so they do not overwrite each other.
 */
export function notificationIdForTree(treeId: string, kind: RevisitNotifyKind = 'date'): number {
	const input = `${kind}:${treeId}`;
	let hash = 2166136261;
	for (let i = 0; i < input.length; i += 1) {
		hash ^= input.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 2147483646 + 1;
}
