/**
 * Translate regions-i18n.ts nl/sv/nb from English via MyMemory (name + biotope).
 * Preserves existing values that already differ from EN.
 * Run: node scripts/mt-regions-locale-maps.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MYMEMORY = { nl: 'nl', sv: 'sv', nb: 'no' };
const sleep = (ms) => new Promise((r) => setTimeout(r, 120));

/** @type {Map<string, Record<string, string>>} */
const cache = new Map();

async function translate(text, loc) {
	const key = `${loc}::${text}`;
	if (cache.has(key)) return cache.get(key);
	if (!text || !/[A-Za-zÀ-ÿ]/.test(text)) {
		cache.set(key, text);
		return text;
	}
	const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=en|${MYMEMORY[loc]}`;
	try {
		const res = await fetch(url);
		const data = await res.json();
		const translated = data?.responseData?.translatedText;
		const out =
			translated && !String(translated).includes('MYMEMORY WARNING') ? translated : text;
		cache.set(key, out);
		return out;
	} catch {
		cache.set(key, text);
		return text;
	}
}

const path = 'src/lib/constants/regions-i18n.ts';
let source = readFileSync(path, 'utf8');

const blockRe =
	/(name|biotope):\s*\{\r?\n\t\t\tfr: '((?:\\'|[^'])*)',\r?\n\t\t\ten: '((?:\\'|[^'])*)',\r?\n\t\t\tde: '((?:\\'|[^'])*)',\r?\n\t\t\tit: '((?:\\'|[^'])*)',\r?\n\t\t\tes: '((?:\\'|[^'])*)',\r?\n\t\t\tnl: '((?:\\'|[^'])*)',\r?\n\t\t\tsv: '((?:\\'|[^'])*)',\r?\n\t\t\tnb: '((?:\\'|[^'])*)'\r?\n\t\t\}/g;

const blocks = [...source.matchAll(blockRe)];
console.log(`Found ${blocks.length} name/biotope blocks`);

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let i = 0;
for (const match of blocks) {
	const [full, kind, fr, en, de, it, es, nl, sv, nb] = match;
	i++;
	let nextNl = nl;
	let nextSv = sv;
	let nextNb = nb;
	if (nl === en) {
		nextNl = await translate(en, 'nl');
		await sleep(100);
	}
	if (sv === en) {
		nextSv = await translate(en, 'sv');
		await sleep(100);
	}
	if (nb === en) {
		nextNb = await translate(en, 'nb');
		await sleep(100);
	}
	const replacement = `${kind}: {
			fr: '${esc(fr)}',
			en: '${esc(en)}',
			de: '${esc(de)}',
			it: '${esc(it)}',
			es: '${esc(es)}',
			nl: '${esc(nextNl)}',
			sv: '${esc(nextSv)}',
			nb: '${esc(nextNb)}'
		}`;
	source = source.replace(full, replacement);
	if (i % 10 === 0) console.log(`  ${i}/${blocks.length}`);
}

writeFileSync(path, source);
console.log(`Wrote ${path}`);
