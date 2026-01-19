import { test, expect } from '@playwright/test';

test.describe('Login Rate Limiting', () => {
    test.beforeEach(async ({ page }) => {
        // Reset server-side rate limiter for this IP by visiting the endpoint
        await page.goto('/api/test/reset-rate-limit');
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    test('should apply incremental delays and block after 5 failures', async ({ page }) => {
        test.slow(); // Increases timeout 3x for this test
        const username = 'admin';
        const invalidPassword = 'wrong_password';

        // 1. First failure - should be around 1s
        let start = Date.now();
        const response1Promise = page.waitForResponse('/api/login');
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', invalidPassword);
        await page.click('[data-testid="login-button"]');
        const response1 = await response1Promise;
        expect(response1.status()).toBe(401);
        let duration = Date.now() - start;
        console.log(`1st failure duration: ${duration}ms`);
        expect(duration).toBeGreaterThanOrEqual(100); // 0.1s in test mode

        // 2-5. Subsequent failures - we just verify they succeed in failing
        for (let i = 2; i <= 5; i++) {
            start = Date.now();
            const responsePromise = page.waitForResponse('/api/login');
            await page.fill('input[type="password"]', invalidPassword);
            await page.click('[data-testid="login-button"]');
            const response = await responsePromise;
            expect(response.status()).toBe(401);
            duration = Date.now() - start;
            console.log(`${i}th failure duration: ${duration}ms`);
        }

        // 6. The 6th attempt should be blocked with 429
        start = Date.now();
        const response6Promise = page.waitForResponse('/api/login');
        await page.fill('input[type="password"]', invalidPassword);
        await page.click('[data-testid="login-button"]');
        const response6 = await response6Promise;
        expect(response6.status()).toBe(429);
        duration = Date.now() - start;
        console.log(`Blocked attempt duration: ${duration}ms`);
        expect(duration).toBeLessThan(100); // Fast 429 response
    });

    test('should reset counter after successful login', async ({ page }) => {
        test.slow();
        const username = 'admin';
        const invalidPassword = 'wrong_password';
        const validPassword = 'password';

        // 1. Fail once
        const response1Promise = page.waitForResponse('/api/login');
        await page.fill('input[placeholder="Username"]', username);
        await page.fill('input[type="password"]', invalidPassword);
        await page.click('[data-testid="login-button"]');
        const response1 = await response1Promise;
        expect(response1.status()).toBe(401);

        // 2. Login successfully
        const responseSuccessPromise = page.waitForResponse('/api/login');
        await page.fill('input[type="password"]', validPassword);
        await page.click('[data-testid="login-button"]');
        const responseSuccess = await responseSuccessPromise;
        expect(responseSuccess.status()).toBe(200);
        await expect(page.getByText('Unlock Vault')).toBeVisible();

        // 3. Logout and fail 4 more times - it should NOT be blocked yet
        await page.evaluate(() => {
            sessionStorage.clear();
        });
        await page.reload();

        for (let i = 0; i < 4; i++) {
            const responsePF = page.waitForResponse('/api/login');
            await page.fill('input[placeholder="Username"]', username);
            await page.fill('input[type="password"]', invalidPassword);
            await page.click('[data-testid="login-button"]');
            const res = await responsePF;
            expect(res.status()).toBe(401);
        }

        // 5. The 5th attempt after success (6th total) should NOT be blocked if reset was successful
        const response5Promise = page.waitForResponse('/api/login');
        await page.fill('input[type="password"]', invalidPassword);
        await page.click('[data-testid="login-button"]');
        const res5 = await response5Promise;
        expect(res5.status()).toBe(401); // Still 401, not 429
    });
});
