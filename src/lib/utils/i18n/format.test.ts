import { describe, expect, it } from 'vitest';
import { formatCalendarDate } from './format';

describe('formatCalendarDate', () => {
	it('formats YYYY-MM-DD as a local calendar day', () => {
		expect(formatCalendarDate('2026-08-16', 'fr')).toBe('16 août 2026');
		expect(formatCalendarDate('2026-08-16', 'en')).toBe('16 August 2026');
	});

	it('does not shift the day via UTC midnight', () => {
		expect(formatCalendarDate('2026-01-01', 'en')).toContain('January');
		expect(formatCalendarDate('2026-01-01', 'en')).toContain('2026');
		expect(formatCalendarDate('2026-01-01', 'en')).not.toContain('December');
	});

	it('returns empty for invalid values', () => {
		expect(formatCalendarDate('')).toBe('');
		expect(formatCalendarDate('16/08/2026')).toBe('');
		expect(formatCalendarDate('2026-08-16T08:00:00.000Z')).toBe('');
		expect(formatCalendarDate('2026-02-31')).toBe('');
	});
});
