import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const base = env.BASE_PATH ?? '';

	return {
		plugins: [
			tailwindcss(),
			sveltekit(),
			VitePWA({
				registerType: 'autoUpdate',
				injectRegister: 'auto',
				includeAssets: ['favicon.svg', 'icons/*.svg'],
				manifest: {
					name: 'Yamadori Scouting',
					short_name: 'Yamadori',
					description: "Repérage d'arbres en forêt",
					theme_color: '#1a2e1a',
					background_color: '#f8faf8',
					display: 'standalone',
					orientation: 'portrait',
					start_url: `${base}/`,
					icons: [
						{
							src: `${base}/icons/icon.svg`,
							sizes: '512x512',
							type: 'image/svg+xml',
							purpose: 'any'
						},
						{
							src: `${base}/icons/icon.svg`,
							sizes: '512x512',
							type: 'image/svg+xml',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
					navigateFallback: `${base}/200.html`,
					runtimeCaching: [
						{
							urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
							handler: 'CacheFirst',
							options: {
								cacheName: 'osm-tiles',
								expiration: {
									maxEntries: 500,
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
