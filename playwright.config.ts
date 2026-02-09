import { defineConfig } from '@playwright/test';

export default defineConfig({
    timeout: 120000,
    expect: {
        timeout: 10000,
    },
    retries: 2,
    webServer: {
        command: 'npm run build && node build',
        port: 3007,
        reuseExistingServer: false,
        timeout: 120000,
        env: {
            // Ensure JWT_SECRET is available for tests
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-for-e2e-tests-only-do-not-use-in-production',
            RATE_LIMIT_TEST_MODE: 'true',
            PORT: '3007',
            ORIGIN: 'http://localhost:3007'
        },
    },
    use: {
        baseURL: 'http://localhost:3007',
        screenshot: 'only-on-failure',
        // PWA requires these permissions
        permissions: ['clipboard-read', 'clipboard-write']
    },
    testDir: 'tests/e2e',
    workers: 1
});
