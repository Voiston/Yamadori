/**
 * Scan source files for UTF-16 encoding (common Windows editor mistake).
 * Usage: node scripts/check-source-encoding.mjs [directory]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? 'src';
const extensions = new Set(['.ts', '.js', '.mjs', '.svelte', '.css', '.json']);
const skipDirs = new Set(['node_modules', '.git', 'build', '.svelte-kit', 'paraglide']);

/** @returns {'utf8' | 'utf16le-bom' | 'utf16be-bom' | 'utf16le'} */
function detectEncoding(buffer) {
	if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
		return 'utf16le-bom';
	}
	if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
		return 'utf16be-bom';
	}
	if (buffer.length >= 4 && buffer[1] === 0 && buffer[3] === 0) {
		return 'utf16le';
	}
	return 'utf8';
}

/** @param {string} dir */
function walk(dir) {
	/** @type {Array<{ path: string; encoding: string }>} */
	const bad = [];

	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!skipDirs.has(entry.name)) {
				bad.push(...walk(path));
			}
			continue;
		}

		const ext = entry.name.slice(entry.name.lastIndexOf('.'));
		if (!extensions.has(ext)) {
			continue;
		}

		const encoding = detectEncoding(readFileSync(path));
		if (encoding !== 'utf8') {
			bad.push({ path: relative(process.cwd(), path), encoding });
		}
	}

	return bad;
}

const results = walk(root);
if (results.length === 0) {
	console.log(`check-source-encoding: all files under ${root}/ are UTF-8`);
	process.exit(0);
}

console.error('check-source-encoding: non-UTF-8 files found:');
for (const file of results) {
	console.error(`  ${file.encoding}\t${file.path}`);
}
console.error('\nIn Cursor: status bar → encoding → Save with Encoding → UTF-8');
process.exit(1);
