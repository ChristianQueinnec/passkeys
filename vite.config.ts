import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),

		VitePWA({
			registerType: 'autoUpdate',
			devOptions: { enabled: true },

			manifest: {
				name: 'Passkeys',
				short_name: 'Passkeys',
				description: 'A secure, simple passkey manager',
				start_url: '/',
				display: 'standalone',
				theme_color: '#ffffff',
				background_color: '#ffffff',
				icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }]
			}
		}),

		devtoolsJson()
	]
});
