import { getLocale, type Locale } from '$lib/paraglide/runtime.js';
import type { CountryCode } from '$lib/geo/countries';

const INTL_LOCALE: Record<Locale, string> = {
	fr: 'fr-FR',
	en: 'en-GB',
	de: 'de-DE',
	it: 'it-IT',
	es: 'es-ES',
	nl: 'nl-NL',
	sv: 'sv-SE',
	nb: 'nb-NO'
};

const ACCEPT_LANGUAGE: Record<Locale, string> = {
	fr: 'fr',
	en: 'en',
	de: 'de',
	it: 'it',
	es: 'es',
	nl: 'nl',
	sv: 'sv',
	nb: 'nb'
};

export type AppLocale = Locale;

export const LOCALE_OPTIONS: { value: AppLocale; label: string }[] = [
	{ value: 'fr', label: 'Français' },
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'Deutsch' },
	{ value: 'it', label: 'Italiano' },
	{ value: 'es', label: 'Español' },
	{ value: 'nl', label: 'Nederlands' },
	{ value: 'sv', label: 'Svenska' },
	{ value: 'nb', label: 'Norsk' }
];

/** Read active locale (Paraglide runtime). */
export function getActiveLocale(): AppLocale {
	return getLocale();
}

/** Alias for reactive blocks that also track appearanceSettingsState.locale in Svelte. */
export function localeDependency(): AppLocale {
	return getLocale();
}

/**
 * BCP 47 locale for Intl formatters.
 * When UI language is English and GPS resolves to US, prefer en-US (dates, etc.).
 */
export function getIntlLocale(
	locale: AppLocale = getActiveLocale(),
	country?: CountryCode | null
): string {
	if (locale === 'en' && country === 'US') return 'en-US';
	if (locale === 'en' && country === 'CA') return 'en-CA';
	if (locale === 'fr' && country === 'CA') return 'fr-CA';
	if (locale === 'en' && country === 'NZ') return 'en-NZ';
	return INTL_LOCALE[locale];
}

export function getAcceptLanguage(locale: AppLocale = getActiveLocale()): string {
	return ACCEPT_LANGUAGE[locale];
}

export function compareLocalized(
	a: string,
	b: string,
	locale: AppLocale = getActiveLocale(),
	country?: CountryCode | null
): number {
	return a.localeCompare(b, getIntlLocale(locale, country));
}
