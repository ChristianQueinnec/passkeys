import { defineConfig } from '@playwright/test';

const host = process.env.PASSKEYS_HOST || 'localhost';
      
export default defineConfig({
    timeout: 120000,
    expect: {
        timeout: 10000,
    },
    retries: 2,
    webServer: {
        command: 'npm run build && node build',
        port: 3000,
        reuseExistingServer: false,
        timeout: 120000,
        env: {
            // Ensure JWT_SECRET is available for tests
            JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-for-e2e-tests-only-do-not-use-in-production',
            // NODE_ENV=test is the single gate that enables /api/test/* endpoints.
            // Do NOT change this to 'development' or 'production'.
            NODE_ENV: 'test',
            PORT: '3000',
            ORIGIN: `http://${host}:3000`
        },
    },
    use: {
        baseURL: `http://${host}:3000`,
        screenshot: 'only-on-failure',
        // PWA requires these permissions
        permissions: ['clipboard-read', 'clipboard-write']
    },
    testDir: 'tests/e2e',
    workers: 1
});
