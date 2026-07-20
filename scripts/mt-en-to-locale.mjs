/**
 * Machine-translate messages/{locale}.json from en.json.
 * Tries Google Translate (gtx) first, falls back to MyMemory.
 * Only fills keys that are missing or still identical to English.
 *
 * Usage: node scripts/mt-en-to-locale.mjs <locale> [--force]
 * Env: MT_SLEEP_MS (default 80), MYMEMORY_EMAIL
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const target = process.argv[2];
const force = process.argv.includes('--force');

if (!target || !/^[a-z]{2}$/.test(target)) {
	console.error('Usage: node scripts/mt-en-to-locale.mjs <locale> [--force]');
	process.exit(1);
}

const GOOGLE_TL = { nb: 'no', sv: 'sv', nl: 'nl', de: 'de', es: 'es', it: 'it', fr: 'fr' };
const MYMEMORY_CODE = { nb: 'no', sv: 'sv', nl: 'nl', de: 'de', es: 'es', it: 'it' };
const pairTo = MYMEMORY_CODE[target] ?? target;
const googleTl = GOOGLE_TL[target] ?? target;
const SLEEP_MS = Number(process.env.MT_SLEEP_MS ?? '80');
const EMAIL = process.env.MYMEMORY_EMAIL ?? '';

const en = JSON.parse(readFileSync('messages/en.json', 'utf8').replace(/^\uFEFF/, ''));
const outPath = `messages/${target}.json`;
const existing = existsSync(outPath)
	? JSON.parse(readFileSync(outPath, 'utf8').replace(/^\uFEFF/, ''))
	: {};

const keys = Object.keys(en);
/** @type {Record<string, string>} */
const out = { ...existing };

const todo = force
	? keys
	: keys.filter((key) => out[key] == null || out[key] === en[key]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {string} original
 * @param {string} translated
 */
function restoreTechnicalTokens(original, translated) {
	let result = translated;
	if (original.includes('ET₀')) {
		result = result.replace(/ET[?∗*⋅·]/g, 'ET₀').replace(/ET0/g, 'ET₀');
	}
	if (original.includes('{')) {
		// Ensure placeholders survived
		for (const m of original.matchAll(/\{[^}]+\}/g)) {
			if (!result.includes(m[0])) {
				// failed translation — keep original
				return original;
			}
		}
	}
	if (original.includes('Yamadori') && !result.includes('Yamadori')) {
		result = result.replace(/yamadori/gi, 'Yamadori');
	}
	return result;
}

async function translateGoogle(text) {
	const url =
		`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${googleTl}&dt=t&q=` +
		encodeURIComponent(text.slice(0, 4500));
	const res = await fetch(url);
	if (!res.ok) throw new Error(`google ${res.status}`);
	const data = await res.json();
	const translated = Array.isArray(data?.[0])
		? data[0].filter(Array.isArray).map((part) => part[0]).join('')
		: null;
	if (!translated) throw new Error('google empty');
	return translated;
}

async function translateMyMemory(text) {
	const emailQs = EMAIL ? `&de=${encodeURIComponent(EMAIL)}` : '';
	const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|${pairTo}${emailQs}`;
	const res = await fetch(url);
	const data = await res.json();
	const translated = data?.responseData?.translatedText;
	if (!translated || String(translated).includes('MYMEMORY WARNING')) {
		throw new Error('mymemory fail');
	}
	return translated;
}

async function translateOne(text) {
	if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) return text;
	try {
		const g = await translateGoogle(text);
		return restoreTechnicalTokens(text, g);
	} catch {
		try {
			const m = await translateMyMemory(text);
			return restoreTechnicalTokens(text, m);
		} catch {
			return text;
		}
	}
}

const BATCH = 25;
let changed = 0;
console.log(
	`Translating ${todo.length}/${keys.length} keys en→${target} (google/${googleTl})${force ? ' [force]' : ' [skip existing]'}…`
);

for (let i = 0; i < todo.length; i += BATCH) {
	const slice = todo.slice(i, i + BATCH);
	for (const key of slice) {
		const next = await translateOne(en[key]);
		if (next !== en[key]) changed++;
		out[key] = next;
		await sleep(SLEEP_MS);
	}
	writeFileSync(outPath, JSON.stringify(out, null, '\t') + '\n');
	console.log(`  ${Math.min(i + BATCH, todo.length)}/${todo.length} (changed ${changed})`);
}

for (const key of keys) {
	if (out[key] == null) out[key] = en[key];
}

writeFileSync(outPath, JSON.stringify(out, null, '\t') + '\n');
console.log(`Wrote ${outPath} — ${changed}/${todo.length} keys differ from EN`);
