import { describe, expect, it } from 'vitest';
import {
	calendarDaysUntil,
	isRevisitDue,
	localDateString,
	normalizeRevisitFields,
	notificationIdForTree,
	parseIsoDate,
	revisitAtLocalEight,
	revisitDateStatus
} from './revisit';

const NOW = new Date(2026, 7, 16, 15, 0, 0, 0);

describe('parseIsoDate', () => {
	it('accepts YYYY-MM-DD', () => {
		expect(parseIsoDate('2026-08-16')).toBe('2026-08-16');
	});

	it('rejects timestamps and junk', () => {
		expect(parseIsoDate('2026-08-16T08:00:00.000Z')).toBeNull();
		expect(parseIsoDate('16/08/2026')).toBeNull();
		expect(parseIsoDate('')).toBeNull();
		expect(parseIsoDate(null)).toBeNull();
	});
});

describe('isRevisitDue', () => {
	it('is due on and after the local date', () => {
		expect(isRevisitDue('2026-08-16', NOW)).toBe(true);
		expect(isRevisitDue('2026-08-15', NOW)).toBe(true);
		expect(isRevisitDue('2026-08-17', NOW)).toBe(false);
	});

	it('ignores missing dates', () => {
		expect(isRevisitDue(null, NOW)).toBe(false);
		expect(isRevisitDue(undefined, NOW)).toBe(false);
	});
});

describe('calendarDaysUntil', () => {
	it('counts local calendar days', () => {
		expect(calendarDaysUntil(null, NOW)).toBeNull();
		expect(calendarDaysUntil('2026-08-16', NOW)).toBe(0);
		expect(calendarDaysUntil('2026-08-17', NOW)).toBe(1);
		expect(calendarDaysUntil('2026-08-22', NOW)).toBe(6);
		expect(calendarDaysUntil('2026-08-23', NOW)).toBe(7);
		expect(calendarDaysUntil('2026-08-15', NOW)).toBe(-1);
	});
});

describe('revisitDateStatus', () => {
	it('classifies none, overdue, today, soon, and upcoming', () => {
		expect(revisitDateStatus(null, NOW)).toBe('none');
		expect(revisitDateStatus('2026-08-15', NOW)).toBe('overdue');
		expect(revisitDateStatus('2026-08-16', NOW)).toBe('today');
		expect(revisitDateStatus('2026-08-17', NOW)).toBe('soon');
		expect(revisitDateStatus('2026-08-22', NOW)).toBe('soon');
		expect(revisitDateStatus('2026-08-23', NOW)).toBe('upcoming');
	});
});

describe('revisitAtLocalEight', () => {
	it('returns 08:00 local on that calendar day', () => {
		const at = revisitAtLocalEight('2026-08-16');
		expect(at?.getHours()).toBe(8);
		expect(at?.getMinutes()).toBe(0);
		expect(at?.getFullYear()).toBe(2026);
		expect(at?.getMonth()).toBe(7);
		expect(at?.getDate()).toBe(16);
	});
});

describe('notificationIdForTree', () => {
	it('is stable, positive, and distinct per kind', () => {
		const dateId = notificationIdForTree('tree-a', 'date');
		const windowId = notificationIdForTree('tree-a', 'window');
		expect(dateId).toBe(notificationIdForTree('tree-a', 'date'));
		expect(dateId).toBeGreaterThan(0);
		expect(dateId).toBeLessThan(2 ** 31);
		expect(windowId).not.toBe(dateId);
		expect(notificationIdForTree('tree-b', 'date')).not.toBe(dateId);
	});
});

describe('normalizeRevisitFields', () => {
	it('defaults missing fields', () => {
		expect(normalizeRevisitFields({})).toEqual({
			nextRevisitAt: null,
			notifyOnWindow: false,
			windowNotifyArmed: false,
			dateNotifySentFor: null
		});
	});

	it('arms when notify is on and armed is omitted', () => {
		expect(normalizeRevisitFields({ notifyOnWindow: true })).toMatchObject({
			notifyOnWindow: true,
			windowNotifyArmed: true
		});
	});

	it('keeps an explicit disarmed flag', () => {
		expect(
			normalizeRevisitFields({ notifyOnWindow: true, windowNotifyArmed: false })
		).toMatchObject({
			notifyOnWindow: true,
			windowNotifyArmed: false
		});
	});

	it('keeps dateNotifySentFor only when it matches nextRevisitAt', () => {
		expect(
			normalizeRevisitFields({
				nextRevisitAt: '2026-09-01',
				dateNotifySentFor: '2026-09-01'
			})
		).toMatchObject({ dateNotifySentFor: '2026-09-01' });
		expect(
			normalizeRevisitFields({
				nextRevisitAt: '2026-09-02',
				dateNotifySentFor: '2026-09-01'
			})
		).toMatchObject({ dateNotifySentFor: null });
	});

	it('arms when notify is on and armed is omitted', () => {
		expect(normalizeRevisitFields({ notifyOnWindow: true })).toMatchObject({
			notifyOnWindow: true,
			windowNotifyArmed: true
		});
	});

	it('keeps an explicit disarmed flag', () => {
		expect(
			normalizeRevisitFields({ notifyOnWindow: true, windowNotifyArmed: false })
		).toMatchObject({
			notifyOnWindow: true,
			windowNotifyArmed: false
		});
	});
});

describe('localDateString', () => {
	it('formats local YYYY-MM-DD', () => {
		expect(localDateString(NOW)).toBe('2026-08-16');
	});
});
