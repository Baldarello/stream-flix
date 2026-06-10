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
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:3000',
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
        command: 'docker compose up -d --build',
        url: 'http://localhost:3000/health',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
