import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the Quix end-to-end suite.
 *
 * The dev server is started automatically before the tests run.
 * Tests live in ./e2e and the recorded traces / screenshots are
 * stored under ./test-results.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    use: {
        baseURL: 'http://localhost:3002',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'docker compose -f ../docker-compose.yml up -d --build',
        url: 'http://localhost:3002/health',
        reuseExistingServer: true,
        timeout: 120_000,
    },
});
