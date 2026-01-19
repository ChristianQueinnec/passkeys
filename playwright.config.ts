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
        env: {
            // Ensure JWT_SECRET is available for tests
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-for-e2e-tests-only-do-not-use-in-production',
            RATE_LIMIT_TEST_MODE: 'true',
        },
    },
    use: {
        baseURL: 'http://localhost:3000',
        screenshot: 'only-on-failure',
    },
    testDir: 'tests/e2e',
    workers: 1
});
