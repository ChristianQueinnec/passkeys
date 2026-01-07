import { defineConfig } from '@playwright/test';

export default defineConfig({
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    webServer: {
        command: 'npm run build && npm run preview -- --port 3000',
        port: 3000,
        reuseExistingServer: !process.env.CI,
    },
    use: {
        baseURL: 'http://localhost:3000',
        screenshot: 'only-on-failure',
    },
    testDir: 'tests/e2e',
    workers: 1
});
