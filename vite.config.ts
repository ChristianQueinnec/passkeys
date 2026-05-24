import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),

		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			devOptions: { enabled: true },
			includeAssets: ['favicon.svg', 'robots.txt', 'favicon.ico', 'favicon-192.png', 'favicon-512.png'],
			workbox: {
				globPatterns: ['**/*.{js,css,ico,png,svg,webmanifest}'],
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'pages-cache',
							expiration: { maxEntries: 50 },
							cacheableResponse: { statuses: [0, 200] }
						}
					},
					{
						urlPattern: ({ request }) => ['style', 'script', 'worker', 'image', 'font'].includes(request.destination),
						handler: 'CacheFirst',
						options: {
							cacheName: 'assets-cache',
							expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
						}
					},
					{
						urlPattern: ({ url }) => url.pathname.endsWith('.json'),
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'data-cache'
						}
					}
				]
			},
			manifest: {
				name: 'Passkeys',
				short_name: 'Passkeys',
				description: 'A secure, simple passkey manager',
				start_url: '/',
				display: 'standalone',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				icons: [
					{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
					{ src: 'favicon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'favicon-512.png', sizes: '512x512', type: 'image/png' },
					{ src: 'favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			}
		}),

		devtoolsJson()
	]
});
