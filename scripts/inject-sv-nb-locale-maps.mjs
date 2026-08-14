/**
 * Add missing sv:/nb: keys to species-i18n.ts and regions-i18n.ts.
 *
 * SAFETY: only inserts when sv/nb are absent. Never overwrites existing values
 * (including after real translations). Do not use this to "refresh" translations.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function inject(source) {
	let s = source;
	// After existing nl: line, ensure sv and nb only if missing
	s = s.replace(
		/(en: '((?:\\'|[^'])*)'[\s\S]*?\tnl: '((?:\\'|[^'])*)')(\r?\n)(\t+\})/g,
		(match, before, enVal, _nlVal, nl, close) => {
			if (/\bsv:/.test(match)) return match;
			return `${before},${nl}\t\tsv: '${enVal}',${nl}\t\tnb: '${enVal}'${nl}${close}`;
		}
	);
	s = s.replace(
		/(en: '((?:\\'|[^'])*)'[\s\S]*?\t\tnl: '((?:\\'|[^'])*)')(\r?\n)(\t+\})/g,
		(match, before, enVal, _nlVal, nl, close) => {
			if (/\bsv:/.test(match)) return match;
			return `${before},${nl}\t\t\tsv: '${enVal}',${nl}\t\t\tnb: '${enVal}'${nl}${close}`;
		}
	);
	return s;
}

for (const file of ['src/lib/constants/species-i18n.ts', 'src/lib/constants/regions-i18n.ts']) {
	const before = readFileSync(file, 'utf8');
	const after = inject(before);
	writeFileSync(file, after);
	console.log(
		file,
		'sv',
		(after.match(/\bsv:/g) || []).length,
		'nb',
		(after.match(/\bnb:/g) || []).length,
		before === after ? '(unchanged — existing sv/nb preserved)' : '(inserted missing only)'
	);
}
