import { getLocale, type Locale } from '$lib/paraglide/runtime.js';

const INTL_LOCALE: Record<Locale, string> = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	it: 'it-IT',
	es: 'es-ES'
};

const ACCEPT_LANGUAGE: Record<Locale, string> = {
	fr: 'fr',
	en: 'en',
	de: 'de',
	it: 'it',
	es: 'es'
};

export type AppLocale = Locale;

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
	{ value: 'fr', label: 'Français' },
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'es', label: 'Español' }
];

/** Read active locale (Paraglide runtime). */
export function getActiveLocale(): AppLocale {
	return getLocale();
}

/** Alias for reactive blocks that also track appearanceSettingsState.locale in Svelte. */
export function localeDependency(): AppLocale {
	return getLocale();
}

export function getIntlLocale(locale: AppLocale = getActiveLocale()): string {
	return INTL_LOCALE[locale];
}

export function getAcceptLanguage(locale: AppLocale = getActiveLocale()): string {
	return ACCEPT_LANGUAGE[locale];
}

export function compareLocalized(a: string, b: string, locale: AppLocale = getActiveLocale()): number {
	return a.localeCompare(b, getIntlLocale(locale));
}
