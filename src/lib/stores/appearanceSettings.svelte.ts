import { get, set } from 'idb-keyval';
import { setLocale, type Locale } from '$lib/paraglide/runtime.js';
import { locales } from '$lib/paraglide/runtime.js';
export { LOCALE_OPTIONS, type AppLocale as LocaleOption } from '$lib/utils/i18n/locale';

const STORAGE_KEY = 'yamadori-appearance-settings';
const OUTDOOR_MIRROR_KEY = 'yamadori-outdoor-mode';
const DARK_MIRROR_KEY = 'yamadori-dark-mode';
const SIMPLE_MIRROR_KEY = 'yamadori-simple-mode';

export type AppLocale = Locale;

type StoredAppearanceSettings = {
	outdoorMode: boolean;
	darkMode: boolean;
	simpleMode: boolean;
	locale?: AppLocale;
};

const DEFAULT_SETTINGS: StoredAppearanceSettings = {
	outdoorMode: false,
	darkMode: false,
	simpleMode: false,
	locale: 'fr'
};

export const appearanceSettingsState = $state({
	loaded: false,
	outdoorMode: false,
	darkMode: false,
	simpleMode: false,
	locale: 'fr' as AppLocale
});

function mirrorOutdoorToLocalStorage(outdoorMode: boolean): void {
	try {
		localStorage.setItem(OUTDOOR_MIRROR_KEY, outdoorMode ? '1' : '0');
	} catch {
		// localStorage unavailable.
	}
}

function mirrorDarkToLocalStorage(darkMode: boolean): void {
	try {
		localStorage.setItem(DARK_MIRROR_KEY, darkMode ? '1' : '0');
	} catch {
		// localStorage unavailable.
	}
}

function mirrorSimpleToLocalStorage(simpleMode: boolean): void {
	try {
		localStorage.setItem(SIMPLE_MIRROR_KEY, simpleMode ? '1' : '0');
	} catch {
		// localStorage unavailable.
	}
}

function detectPreferredLocale(): AppLocale {
	if (typeof navigator === 'undefined') {
		return DEFAULT_SETTINGS.locale!;
	}
	const lang = navigator.language.toLowerCase();
	for (const locale of locales) {
		if (lang === locale || lang.startsWith(`${locale}-`)) {
			return locale;
		}
	}
	return DEFAULT_SETTINGS.locale!;
}

function isValidLocale(value: unknown): value is AppLocale {
	return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

function applyParaglideLocale(locale: AppLocale): void {
	setLocale(locale, { reload: false });
	if (typeof document !== 'undefined') {
		document.documentElement.lang = locale;
	}
}

async function persistAppearanceSettings(): Promise<void> {
	await set(STORAGE_KEY, {
		outdoorMode: appearanceSettingsState.outdoorMode,
		darkMode: appearanceSettingsState.darkMode,
		simpleMode: appearanceSettingsState.simpleMode,
		locale: appearanceSettingsState.locale
	} satisfies StoredAppearanceSettings);
}

export function isSimpleMode(): boolean {
	return appearanceSettingsState.simpleMode;
}

export async function initAppearanceSettings(): Promise<void> {
	try {
		const stored = await get<
			StoredAppearanceSettings | { outdoorMode: boolean; simpleMode?: boolean; darkMode?: boolean }
		>(STORAGE_KEY);
		if (stored) {
			appearanceSettingsState.outdoorMode = stored.outdoorMode ?? DEFAULT_SETTINGS.outdoorMode;
			appearanceSettingsState.darkMode =
				'darkMode' in stored && typeof stored.darkMode === 'boolean'
					? stored.darkMode
					: DEFAULT_SETTINGS.darkMode;
			appearanceSettingsState.simpleMode =
				'simpleMode' in stored && typeof stored.simpleMode === 'boolean'
					? stored.simpleMode
					: DEFAULT_SETTINGS.simpleMode;
			appearanceSettingsState.locale =
				'locale' in stored && isValidLocale(stored.locale)
					? stored.locale
					: detectPreferredLocale();
			if (appearanceSettingsState.outdoorMode && appearanceSettingsState.darkMode) {
				appearanceSettingsState.darkMode = false;
			}
			mirrorOutdoorToLocalStorage(appearanceSettingsState.outdoorMode);
			mirrorDarkToLocalStorage(appearanceSettingsState.darkMode);
			mirrorSimpleToLocalStorage(appearanceSettingsState.simpleMode);
		} else {
			appearanceSettingsState.locale = detectPreferredLocale();
		}
	} catch {
		appearanceSettingsState.outdoorMode = DEFAULT_SETTINGS.outdoorMode;
		appearanceSettingsState.darkMode = DEFAULT_SETTINGS.darkMode;
		appearanceSettingsState.simpleMode = DEFAULT_SETTINGS.simpleMode;
		appearanceSettingsState.locale = DEFAULT_SETTINGS.locale!;
	} finally {
		applyParaglideLocale(appearanceSettingsState.locale);
		appearanceSettingsState.loaded = true;
	}
}

export async function setOutdoorMode(enabled: boolean): Promise<void> {
	appearanceSettingsState.outdoorMode = enabled;
	if (enabled) {
		appearanceSettingsState.darkMode = false;
		mirrorDarkToLocalStorage(false);
	}
	mirrorOutdoorToLocalStorage(enabled);
	await persistAppearanceSettings();
}

export async function setDarkMode(enabled: boolean): Promise<void> {
	appearanceSettingsState.darkMode = enabled;
	if (enabled) {
		appearanceSettingsState.outdoorMode = false;
		mirrorOutdoorToLocalStorage(false);
	}
	mirrorDarkToLocalStorage(enabled);
	await persistAppearanceSettings();
}

export async function setSimpleMode(enabled: boolean): Promise<void> {
	appearanceSettingsState.simpleMode = enabled;
	mirrorSimpleToLocalStorage(enabled);
	await persistAppearanceSettings();
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
	appearanceSettingsState.locale = locale;
	applyParaglideLocale(locale);
	await persistAppearanceSettings();
}

export async function restoreAppearanceSettings(settings: {
	outdoorMode: boolean;
	darkMode?: boolean;
	simpleMode?: boolean;
	locale?: AppLocale;
}): Promise<void> {
	appearanceSettingsState.outdoorMode = settings.outdoorMode;
	appearanceSettingsState.darkMode = settings.darkMode ?? DEFAULT_SETTINGS.darkMode;
	appearanceSettingsState.simpleMode = settings.simpleMode ?? DEFAULT_SETTINGS.simpleMode;
	if (settings.locale && isValidLocale(settings.locale)) {
		appearanceSettingsState.locale = settings.locale;
		applyParaglideLocale(settings.locale);
	}
	if (appearanceSettingsState.outdoorMode && appearanceSettingsState.darkMode) {
		appearanceSettingsState.darkMode = false;
	}
	mirrorOutdoorToLocalStorage(appearanceSettingsState.outdoorMode);
	mirrorDarkToLocalStorage(appearanceSettingsState.darkMode);
	mirrorSimpleToLocalStorage(appearanceSettingsState.simpleMode);
	await persistAppearanceSettings();
}

export async function toggleOutdoorMode(): Promise<void> {
	await setOutdoorMode(!appearanceSettingsState.outdoorMode);
}

export async function toggleDarkMode(): Promise<void> {
	await setDarkMode(!appearanceSettingsState.darkMode);
}

export async function toggleSimpleMode(): Promise<void> {
	await setSimpleMode(!appearanceSettingsState.simpleMode);
}
