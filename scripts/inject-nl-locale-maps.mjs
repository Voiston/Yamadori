/**
 * Add missing nl: keys to species-i18n.ts and regions-i18n.ts.
 *
 * SAFETY: only inserts when nl is absent. Never overwrites existing values
 * (including after real translations). Do not use this to "refresh" translations.
 */
import { readFileSync, writeFileSync } from 'node:fs';

function injectNl(source) {
	return source.replace(
		/(en: '((?:\\'|[^'])*)',[\s\S]*?\tes: '((?:\\'|[^'])*)')(\r?\n)(\t+\})/g,
		(match, beforeEs, enVal, _esVal, nl, closeIndent) => {
			if (/\bnl:/.test(match)) return match;
			return `${beforeEs},${nl}\t\tnl: '${enVal}'${nl}${closeIndent}`;
		}
	);
}

for (const file of ['src/lib/constants/species-i18n.ts', 'src/lib/constants/regions-i18n.ts']) {
	const before = readFileSync(file, 'utf8');
	const after = injectNl(before);
	writeFileSync(file, after);
	const added = (after.match(/\bnl:/g) || []).length - (before.match(/\bnl:/g) || []).length;
	console.log(
		`${file}: +${added} nl entries` +
			(before === after ? ' (unchanged — existing nl preserved)' : '')
	);
}
