import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
	plugins: [
		sveltekit(),
	],
    define: {
        PASSKEYS_VERSION: `"${pkg.version}"`,
    }
});
