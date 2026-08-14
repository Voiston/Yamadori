/**
 * Translate regions-i18n.ts pt/da/fi from English via MyMemory (name + biotope).
 * Preserves existing values that already differ from EN.
 * Run: node scripts/mt-regions-pt-da-fi.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MYMEMORY = { pt: 'pt', da: 'da', fi: 'fi' };
const sleep = (ms) => new Promise((r) => setTimeout(r, 100));

/** @type {Map<string, string>} */
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
	/(name|biotope):\s*\{\r?\n\t\t\tfr: '((?:\\'|[^'])*)',\r?\n\t\t\ten: '((?:\\'|[^'])*)',\r?\n\t\t\tde: '((?:\\'|[^'])*)',\r?\n\t\t\tit: '((?:\\'|[^'])*)',\r?\n\t\t\tes: '((?:\\'|[^'])*)',\r?\n\t\t\tnl: '((?:\\'|[^'])*)',\r?\n\t\t\tsv: '((?:\\'|[^'])*)',\r?\n\t\t\tnb: '((?:\\'|[^'])*)',\r?\n\t\t\tpt: '((?:\\'|[^'])*)',\r?\n\t\t\tda: '((?:\\'|[^'])*)',\r?\n\t\t\tfi: '((?:\\'|[^'])*)'\r?\n\t\t\}/g;

const blocks = [...source.matchAll(blockRe)];
console.log(`Found ${blocks.length} name/biotope blocks`);

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

let i = 0;
for (const match of blocks) {
	const [full, kind, fr, en, de, it, es, nl, sv, nb, pt, da, fi] = match;
	i++;
	let nextPt = pt;
	let nextDa = da;
	let nextFi = fi;
	if (pt === en) {
		nextPt = await translate(en, 'pt');
		await sleep(80);
	}
	if (da === en) {
		nextDa = await translate(en, 'da');
		await sleep(80);
	}
	if (fi === en) {
		nextFi = await translate(en, 'fi');
		await sleep(80);
	}
	const replacement = `${kind}: {
			fr: '${esc(fr)}',
			en: '${esc(en)}',
			de: '${esc(de)}',
			it: '${esc(it)}',
			es: '${esc(es)}',
			nl: '${esc(nl)}',
			sv: '${esc(sv)}',
			nb: '${esc(nb)}',
			pt: '${esc(nextPt)}',
			da: '${esc(nextDa)}',
			fi: '${esc(nextFi)}'
		}`;
	source = source.replace(full, replacement);
	if (i % 10 === 0) console.log(`  ${i}/${blocks.length}`);
}

writeFileSync(path, source);
console.log(`Done — wrote ${path}`);
