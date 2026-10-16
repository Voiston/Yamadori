import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	CSP_CONNECT_HOSTS,
	CSP_CONNECT_HOST_SET,
	cspConnectSrcDirective,
	originFromUrl
} from './cspConnectHosts';

const here = dirname(fileURLToPath(import.meta.url));
const srcLib = join(here, '..');
const appHtml = join(here, '../../../src/app.html');

function listTsFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...listTsFiles(full));
			continue;
		}
		if (!entry.endsWith('.ts') && !entry.endsWith('.js')) continue;
		if (entry.endsWith('.test.ts') || entry.endsWith('.test.js')) continue;
		out.push(full);
	}
	return out;
}

function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function fetchHostsInFile(source: string): string[] {
	if (!source.includes('fetch(')) return [];
	const stripped = stripComments(source);
	const hosts = new Set<string>();
	const matches = stripped.matchAll(/https?:\/\/[a-zA-Z0-9.-]+/g);
	for (const match of matches) {
		const origin = originFromUrl(match[0]);
		if (origin) hosts.add(origin);
	}
	return [...hosts];
}

describe('CSP connect-src hosts', () => {
	it('pins app.html connect-src to the known host list', () => {
		const html = readFileSync(appHtml, 'utf8');
		expect(html).not.toMatch(/connect-src 'self' https:(?=\s|;)/);
		for (const host of CSP_CONNECT_HOSTS) {
			expect(html).toContain(host);
		}
		const directive = cspConnectSrcDirective();
		expect(html).toContain(directive);
	});

	it('lists every https host fetched from src/lib', () => {
		const missing: string[] = [];
		for (const file of listTsFiles(srcLib)) {
			const hosts = fetchHostsInFile(readFileSync(file, 'utf8'));
			for (const host of hosts) {
				if (host.includes('opengis.net') || host.includes('www.w3.org')) {
					continue;
				}
				if (!CSP_CONNECT_HOST_SET.has(host)) {
					missing.push(`${relative(srcLib, file)} → ${host}`);
				}
			}
		}
		expect(missing).toEqual([]);
	});
});
