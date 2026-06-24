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

export function formatNumber(value: number, locale = getActiveLocale()): string {
	return value.toLocaleString(getIntlLocale(locale));
}

export function formatTime(isoOrDate: string | Date, locale = getActiveLocale()): string {
	const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
	return date.toLocaleTimeString(getIntlLocale(locale), { hour: '2-digit', minute: '2-digit' });
}
