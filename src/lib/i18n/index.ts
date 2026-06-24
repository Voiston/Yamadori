export * as m from '$lib/paraglide/messages.js';
export { getLocale, setLocale, locales, type Locale } from '$lib/paraglide/runtime.js';
export {
	getActiveLocale,
	getIntlLocale,
	getAcceptLanguage,
	compareLocalized,
	localeDependency,
	LOCALE_OPTIONS,
	type AppLocale
} from '$lib/utils/i18n/locale';
export { formatDate, formatNumber, formatTime } from '$lib/utils/i18n/format';
