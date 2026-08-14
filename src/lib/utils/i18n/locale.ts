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
	nb: 'nb-NO',
	pt: 'pt-PT',
	da: 'da-DK',
	fi: 'fi-FI'
};

const ACCEPT_LANGUAGE: Record<Locale, string> = {
	fr: 'fr',
	en: 'en',
	de: 'de',
	it: 'it',
	es: 'es',
	nl: 'nl',
	sv: 'sv',
	nb: 'nb',
	pt: 'pt',
	da: 'da',
	fi: 'fi'
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
	{ value: 'nb', label: 'Norsk' },
	{ value: 'pt', label: 'Português' },
	{ value: 'da', label: 'Dansk' },
	{ value: 'fi', label: 'Suomi' }
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
	if (locale === 'en' && country === 'AU') return 'en-AU';
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

/**
 * Primary app locale for a GPS country (for bilingual share text, etc.).
 * Countries without a dedicated UI language fall back to English.
 */
export function localeForCountry(country: CountryCode | null): AppLocale | null {
	if (!country) return null;
	switch (country) {
		case 'FR':
		case 'BE':
			return 'fr';
		case 'ES':
			return 'es';
		case 'IT':
			return 'it';
		case 'DE':
		case 'AT':
		case 'CH':
			return 'de';
		case 'NL':
			return 'nl';
		case 'SE':
			return 'sv';
		case 'NO':
			return 'nb';
		case 'PT':
			return 'pt';
		case 'DK':
			return 'da';
		case 'FI':
			return 'fi';
		case 'GB':
		case 'US':
		case 'CA':
		case 'NZ':
		case 'AU':
		case 'IE':
		case 'JP':
			return 'en';
		default:
			return 'en';
	}
}
