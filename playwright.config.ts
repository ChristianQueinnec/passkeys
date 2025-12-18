import { defineConfig } from '@playwright/test';

export default defineConfig({
    /*
        webServer: {
            command: 'npm run build && npm run preview',
            port: 3000
        },
    */
    use: {
        baseURL: 'http://localhost:3000',
    },
    testDir: 'tests/e2e'
});
