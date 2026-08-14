/**
 * Smoke-check hardcoded HTTPS URLs used by legal / permit / species-search surfaces.
 *
 * Scans:
 *   - src/lib/geo/legal/
 *   - src/lib/geo/speciesSearchUrls.ts
 *   - src/lib/geo/providers/species-protection/
 *
 * Hard fail: HTTP 404 / 410 (dead pages — same class as the FR F34574 / IT Carabinieri rot).
 * Soft warn: 403 / 5xx / network / timeout (often bot protection, e.g. NatureScot, BMEL).
 *
 * Usage: node scripts/check-permit-links.mjs
 * npm:   npm run links:check
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

/** Directories and files to scan for quoted https:// literals. */
const SCAN_TARGETS = [
	join(ROOT, 'src', 'lib', 'geo', 'legal'),
	join(ROOT, 'src', 'lib', 'geo', 'speciesSearchUrls.ts'),
	join(ROOT, 'src', 'lib', 'geo', 'providers', 'species-protection')
];

const URL_RE = /['"](https:\/\/[^'"`]+?)['"]/g;
const HARD_FAIL = new Set([404, 410]);
const CONCURRENCY = 6;
const TIMEOUT_MS = 20_000;
const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listSourceFiles(dir) {
	/** @type {string[]} */
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		const st = statSync(full);
		if (st.isDirectory()) {
			out.push(...listSourceFiles(full));
			continue;
		}
		if (/\.(ts|js|mjs)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.js')) {
			out.push(full);
		}
	}
	return out;
}

/**
 * @param {string} target
 * @returns {string[]}
 */
function resolveScanFiles(target) {
	if (!existsSync(target)) return [];
	const st = statSync(target);
	if (st.isFile()) return [target];
	if (st.isDirectory()) return listSourceFiles(target);
	return [];
}

/**
 * Strip trailing punctuation commonly captured after a URL in source.
 * @param {string} raw
 */
function normalizeUrl(raw) {
	return raw.replace(/[.,;:]+$/u, '');
}

/**
 * @returns {Map<string, string[]>} url → relative file paths
 */
function collectUrls() {
	/** @type {Map<string, string[]>} */
	const byUrl = new Map();
	/** @type {string[]} */
	const files = [];
	for (const target of SCAN_TARGETS) {
		files.push(...resolveScanFiles(target));
	}

	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		const rel = relative(ROOT, file).replaceAll('\\', '/');
		for (const match of text.matchAll(URL_RE)) {
			const url = normalizeUrl(match[1] ?? match[0]);
			if (!url.startsWith('https://')) continue;
			// Skip template-literal fragments accidentally quoted in source comments.
			if (url.includes('${')) continue;
			const prev = byUrl.get(url);
			if (prev) {
				if (!prev.includes(rel)) prev.push(rel);
			} else {
				byUrl.set(url, [rel]);
			}
		}
	}
	return byUrl;
}

/**
 * @param {string} url
 * @returns {Promise<{ status: number | 'ERR'; detail?: string }>}
 */
async function probeOnce(url) {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method: 'GET',
			redirect: 'follow',
			signal: ctrl.signal,
			headers: {
				'User-Agent': USER_AGENT,
				Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
			}
		});
		// Drain body so connections close cleanly; ignore content.
		await res.arrayBuffer().catch(() => undefined);
		return { status: res.status };
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		return { status: 'ERR', detail };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Retry once on hard-fail statuses — some government CDNs flake with intermittent 404.
 * @param {string} url
 */
async function probe(url) {
	const first = await probeOnce(url);
	if (typeof first.status === 'number' && HARD_FAIL.has(first.status)) {
		await new Promise((r) => setTimeout(r, 750));
		return probeOnce(url);
	}
	return first;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<void>} worker
 */
async function mapPool(items, limit, worker) {
	let i = 0;
	async function run() {
		while (i < items.length) {
			const idx = i++;
			await worker(items[idx]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
}

const byUrl = collectUrls();
const urls = [...byUrl.keys()].sort();

if (urls.length === 0) {
	console.error('No HTTPS URLs found in legal / species-search / species-protection sources.');
	process.exit(1);
}

console.log(
	`Checking ${urls.length} unique HTTPS URL(s) from legal + species-search + species-protection …`
);

/** @type {{ url: string; status: number | 'ERR'; files: string[]; detail?: string }[]} */
const fails = [];
/** @type {{ url: string; status: number | 'ERR'; files: string[]; detail?: string }[]} */
const warns = [];
let ok = 0;

await mapPool(urls, CONCURRENCY, async (url) => {
	const result = await probe(url);
	const files = byUrl.get(url) ?? [];
	const entry = { url, status: result.status, files, detail: result.detail };

	if (typeof result.status === 'number' && result.status >= 200 && result.status < 400) {
		ok += 1;
		return;
	}
	if (typeof result.status === 'number' && HARD_FAIL.has(result.status)) {
		fails.push(entry);
		return;
	}
	warns.push(entry);
});

fails.sort((a, b) => a.url.localeCompare(b.url));
warns.sort((a, b) => a.url.localeCompare(b.url));

console.log(`OK: ${ok}  WARN: ${warns.length}  FAIL: ${fails.length}`);

for (const w of warns) {
	const where = w.files.join(', ');
	const extra = w.detail ? ` (${w.detail})` : '';
	console.warn(`WARN ${w.status} ${w.url} ← ${where}${extra}`);
}

for (const f of fails) {
	const where = f.files.join(', ');
	console.error(`FAIL ${f.status} ${f.url} ← ${where}`);
}

if (fails.length > 0) {
	console.error(
		`\n${fails.length} dead link(s) (404/410). Replace URLs in src/lib/geo/ then re-run.`
	);
	process.exit(1);
}

console.log('No 404/410 dead links detected.');
