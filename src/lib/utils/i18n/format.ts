import { getActiveLocale, getIntlLocale } from '$lib/utils/i18n/locale';

export function formatDate(iso: string, locale = getActiveLocale()): string {
	return new Intl.DateTimeFormat(getIntlLocale(locale), {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(new Date(iso));
}

/** Format a local calendar date `YYYY-MM-DD` without a time (no UTC parse). */
export function formatCalendarDate(isoDate: string, locale = getActiveLocale()): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
	if (!match) return '';
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return '';
	}
	return new Intl.DateTimeFormat(getIntlLocale(locale), {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(date);
}

export function formatNumber(value: number, locale = getActiveLocale()): string {
	return value.toLocaleString(getIntlLocale(locale));
}

export function formatTime(isoOrDate: string | Date, locale = getActiveLocale()): string {
	const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
	return date.toLocaleTimeString(getIntlLocale(locale), { hour: '2-digit', minute: '2-digit' });
}
