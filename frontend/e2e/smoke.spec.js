/**
 * Smoke e2e test: open the app as a guest and confirm the home view
 * renders cleanly with no console errors. The `#screen-home` sentinel
 * is mounted by the `HomeView` component once the SPA has reached the
 * default (unauthenticated) landing screen.
 *
 * This is the minimum bar for the rest of the e2e suite: if this test
 * fails, the app is either not running, broken at boot, or the home
 * view contract has regressed.
 */
import { test, expect } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3000/';

test('smoke: home page loads cleanly for guest users', async ({ page }) => {
    const consoleErrors = [];

    // Capture every console.error from the very first paint so a
    // failure during boot cannot slip past the assertion below.
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    // Navigate to the app root. "Login as guest" is the default
    // unauthenticated state – there is no auth gate, the SPA simply
    // mounts and the home view is the landing screen.
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });

    // Wait for the home view sentinel. This proves the SPA finished
    // its initial render and the FeatureRouter resolved to 'home'.
    await page.waitForSelector('#screen-home', { timeout: 30_000 });

    // Give the home view a beat to settle (rows fetch, effects run)
    // before we sample the console. A short, fixed wait is more
    // stable than relying on additional network or animation cues.
    await page.waitForTimeout(500);

    // The home view must not produce any console errors.
    expect(
        consoleErrors,
        consoleErrors.length > 0
            ? `Unexpected console.error events:\n${consoleErrors.join('\n')}`
            : ''
    ).toHaveLength(0);

    // Capture a screenshot of the rendered home view for visual
    // verification of the smoke run.
    await page.screenshot({ path: 'test-results/smoke-home.png', fullPage: true });
});
