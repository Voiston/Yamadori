import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('build/200.html');
const target = resolve('build/404.html');

if (!existsSync(source)) {
	console.error('copy-spa-fallback: build/200.html not found — run vite build first');
	process.exit(1);
}

copyFileSync(source, target);
console.log('copy-spa-fallback: build/404.html created for GitHub Pages SPA routing');
