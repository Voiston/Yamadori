import { readFileSync } from 'node:fs';

const locales = ['fr', 'en', 'de', 'it', 'es', 'nl', 'sv', 'nb'];
const baseLocale = 'fr';

/** Locales where leftover English is tracked as a quality signal. */
const ENGLISH_LEFTOVER_LOCALES = ['nl', 'sv', 'nb'];

/**
 * Soft fail if too many strings still match English while French differs.
 * Override with I18N_EN_IDENTICAL_MAX_PCT (e.g. 100 to report-only).
 * After MT passes, default keeps shells from regressing.
 */
const EN_IDENTICAL_MAX_PCT = Number(process.env.I18N_EN_IDENTICAL_MAX_PCT ?? '15');

/** Placeholders allowed to differ across locales (plural suffix injection). */
const LOCALE_SUFFIX_PLACEHOLDERS = new Set(['s', 'en', 'o/i', 'es']);

/** @type {Record<string, Record<string, string>>} */
const messagesByLocale = {};

/** @type {Record<string, Set<string>>} */
const keysByLocale = {};

for (const loc of locales) {
	const filePath = `messages/${loc}.json`;
	const data = JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
	messagesByLocale[loc] = data;
	keysByLocale[loc] = new Set(Object.keys(data));
}

/**
 * @param {string} text
 * @returns {Set<string>}
 */
function extractPlaceholders(text) {
	const placeholders = new Set();
	for (const match of text.matchAll(/\{([^}]+)\}/g)) {
		placeholders.add(match[1]);
	}
	return placeholders;
}

/**
 * @param {Set<string>} placeholders
 * @returns {Set<string>}
 */
function normalizePlaceholders(placeholders) {
	const normalized = new Set(placeholders);
	for (const key of LOCALE_SUFFIX_PLACEHOLDERS) {
		normalized.delete(key);
	}
	return normalized;
}

const baseKeys = keysByLocale[baseLocale];
let failed = false;

for (const loc of locales) {
	if (loc === baseLocale) {
		continue;
	}

	const localeKeys = keysByLocale[loc];
	const missing = [...baseKeys].filter((key) => !localeKeys.has(key));
	const extra = [...localeKeys].filter((key) => !baseKeys.has(key));

	if (missing.length > 0) {
		failed = true;
		console.error(`[i18n] ${loc}.json missing ${missing.length} key(s) from ${baseLocale}:`);
		for (const key of missing.slice(0, 15)) {
			console.error(`  - ${key}`);
		}
		if (missing.length > 15) {
			console.error(`  … and ${missing.length - 15} more`);
		}
	}

	if (extra.length > 0) {
		failed = true;
		console.error(`[i18n] ${loc}.json has ${extra.length} extra key(s) not in ${baseLocale}:`);
		for (const key of extra.slice(0, 15)) {
			console.error(`  - ${key}`);
		}
		if (extra.length > 15) {
			console.error(`  … and ${extra.length - 15} more`);
		}
	}
}

for (const key of baseKeys) {
	const basePlaceholders = extractPlaceholders(messagesByLocale[baseLocale][key] ?? '');
	const baseNormalized = normalizePlaceholders(basePlaceholders);

	for (const loc of locales) {
		if (loc === baseLocale) {
			continue;
		}

		const text = messagesByLocale[loc][key] ?? '';
		const localePlaceholders = extractPlaceholders(text);
		const localeNormalized = normalizePlaceholders(localePlaceholders);

		for (const placeholder of localeNormalized) {
			if (!baseNormalized.has(placeholder)) {
				failed = true;
				console.error(
					`[i18n] ${loc}.json key "${key}" uses unknown placeholder {${placeholder}} (not in ${baseLocale})`
				);
			}
		}

		for (const placeholder of baseNormalized) {
			if (!localeNormalized.has(placeholder)) {
				failed = true;
				console.error(
					`[i18n] ${loc}.json key "${key}" missing placeholder {${placeholder}} (required by ${baseLocale})`
				);
			}
		}

		for (const placeholder of localePlaceholders) {
			if (
				!basePlaceholders.has(placeholder) &&
				!LOCALE_SUFFIX_PLACEHOLDERS.has(placeholder)
			) {
				failed = true;
				console.error(
					`[i18n] ${loc}.json key "${key}" has unexpected placeholder {${placeholder}}`
				);
			}
		}
	}
}

const enMessages = messagesByLocale.en;
const frMessages = messagesByLocale.fr;
const reportKeys = [...baseKeys].filter((key) => key in enMessages);

console.log('[i18n] English leftover report (locale === en while fr !== en):');
for (const loc of ENGLISH_LEFTOVER_LOCALES) {
	const localeMessages = messagesByLocale[loc];
	const leftover = reportKeys.filter(
		(key) => localeMessages[key] === enMessages[key] && frMessages[key] !== enMessages[key]
	);
	const identicalRaw = reportKeys.filter((key) => localeMessages[key] === enMessages[key]);
	const pct = (100 * leftover.length) / reportKeys.length;
	const pctRaw = (100 * identicalRaw.length) / reportKeys.length;
	console.log(
		`  ${loc}: ${leftover.length}/${reportKeys.length} likely untranslated (${pct.toFixed(1)}%)` +
			` — raw identical-to-en ${identicalRaw.length} (${pctRaw.toFixed(1)}%)`
	);

	if (pct > EN_IDENTICAL_MAX_PCT) {
		failed = true;
		console.error(
			`[i18n] ${loc}.json exceeds English-leftover budget: ${pct.toFixed(1)}% > ${EN_IDENTICAL_MAX_PCT}%` +
				` (set I18N_EN_IDENTICAL_MAX_PCT to raise)`
		);
		for (const key of leftover.slice(0, 12)) {
			console.error(`  - ${key}`);
		}
		if (leftover.length > 12) {
			console.error(`  … and ${leftover.length - 12} more`);
		}
	}
}

if (failed) {
	process.exit(1);
}

console.log(
	`[i18n] OK — ${baseKeys.size} keys in sync across ${locales.length} locales (placeholders + EN leftover validated)`
);
