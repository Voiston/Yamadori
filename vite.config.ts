import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
	base: '/',
	plugins: [
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['localStorage', 'preferredLanguage', 'baseLocale']
		}),
		tailwindcss(),
		sveltekit(),
		{
			name: 'yamadori-spa-404',
			apply: 'build',
			enforce: 'post',
			closeBundle() {
				const source = resolve('build/200.html');
				const target = resolve('build/404.html');
				if (existsSync(source)) {
					copyFileSync(source, target);
				}
			}
		}
	]
});
