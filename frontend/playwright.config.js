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
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: 'http://localhost:3002',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'bun run dev',
        url: 'http://localhost:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
