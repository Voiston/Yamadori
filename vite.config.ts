import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const base = env.BASE_PATH ?? '';
	const basePrefix = base ? base.replace(/\/$/, '') : '';
	const navigateFallbackAllowlist = basePrefix
		? [new RegExp(`^${escapeRegExp(basePrefix)}/`)]
		: [/^\//];

	return {
		plugins: [
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
			},
			VitePWA({
				registerType: 'prompt',
				injectRegister: 'auto',
				includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
				manifest: {
					id: base ? `${base}/` : '/',
					name: 'Yamadori Scouting',
					short_name: 'Yamadori',
					description: "Repérage d'arbres en forêt",
					theme_color: '#1a2e1a',
					background_color: '#f8faf8',
					display: 'standalone',
					orientation: 'any',
					scope: base ? `${base}/` : '/',
					start_url: `${base}/`,
					icons: [
						{
							src: `${base}/icons/icon-192.png`,
							sizes: '192x192',
							type: 'image/png',
							purpose: 'any'
						},
						{
							src: `${base}/icons/icon-512.png`,
							sizes: '512x512',
							type: 'image/png',
							purpose: 'any'
						},
						{
							src: `${base}/icons/icon-512.png`,
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
					cleanupOutdatedCaches: true,
					navigateFallback: `${base}/200.html`,
					navigateFallbackAllowlist,
					runtimeCaching: [
						{
							urlPattern: /^https:\/\/data\.geopf\.fr\/.*/i,
							handler: 'CacheFirst',
							options: {
								cacheName: 'ign-tiles',
								expiration: {
									maxEntries: 300,
									maxAgeSeconds: 60 * 60 * 24 * 30
								}
							}
						}
					]
				},
				devOptions: { enabled: true }
			})
		]
	};
});
