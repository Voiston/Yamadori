/**
 * Add missing pt:/da:/fi: keys to species-i18n.ts and regions-i18n.ts.
 *
 * SAFETY: only inserts when pt/da/fi are absent. Never overwrites existing values.
 * Seeds from the English value (same pattern as inject-sv-nb-locale-maps.mjs).
 */
import { readFileSync, writeFileSync } from 'node:fs';

function inject(source) {
	return source.replace(
		/^(\t+)nb: '((?:\\'|[^'])*)'(,?)\r?\n(?!\1pt:)/gm,
		(match, indent, nbVal, comma, offset, full) => {
			// Only insert if next lines don't already have pt at this indent
			const after = full.slice(offset + match.length, offset + match.length + 40);
			if (after.startsWith(`${indent}pt:`)) return match;
			return `${indent}nb: '${nbVal}'${comma}\n${indent}pt: '${nbVal}',\n${indent}da: '${nbVal}',\n${indent}fi: '${nbVal}'\n`;
		}
	);
}

for (const file of ['src/lib/constants/species-i18n.ts', 'src/lib/constants/regions-i18n.ts']) {
	const before = readFileSync(file, 'utf8');
	const after = inject(before);
	writeFileSync(file, after);
	console.log(
		file,
		'pt',
		(after.match(/\bpt:/g) || []).length,
		'da',
		(after.match(/\bda:/g) || []).length,
		'fi',
		(after.match(/\bfi:/g) || []).length,
		before === after ? '(unchanged — existing pt/da/fi preserved)' : '(inserted missing only)'
	);
}
