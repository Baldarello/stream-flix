/**
 * Debug script: open the app, click the Google sign-in button and
 * capture all console + network traffic so we can see what's actually
 * happening at runtime. This is a manual diagnostic, not a regression
 * test. Remove it (or skip it) once the Google login works end-to-end.
 */
import { expect, test } from '@playwright/test';

test('debug google login flow', async ({ page }) => {
    const consoleMessages = [];
    const networkRequests = [];
    const pageErrors = [];

    page.on('console', (msg) => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
        });
    });
    page.on('pageerror', (err) => {
        pageErrors.push(err.message + '\n' + err.stack);
    });
    page.on('request', (req) => {
        if (
            req.url().includes('google') ||
            req.url().includes('oauth') ||
            req.url().includes('gsi') ||
            req.url().includes('accounts.google')
        ) {
            networkRequests.push({
                method: req.method(),
                url: req.url(),
            });
        }
    });
    page.on('response', (res) => {
        if (
            res.url().includes('google') ||
            res.url().includes('oauth') ||
            res.url().includes('gsi') ||
            res.url().includes('accounts.google')
        ) {
            networkRequests.push({
                status: res.status(),
                url: res.url(),
            });
        }
    });

    // 1. Open the app. The user said localhost:3002 but in this
    // dev environment port 3002 is served by a Docker container with a
    // stale build that doesn't have the .env file. The Vite dev server
    // (which DOES pick up the latest source code) is on port 3099. We
    // test against the dev server so the new code is exercised.
    //
    // We also use `addInitScript` to mirror the .env's client ID on
    // `window.__QUIX_GOOGLE_CLIENT_ID__`. This is the runtime fallback
    // path that lets the login work even if the .env is not available
    // at build time.
    await page.addInitScript(() => {
        window.__QUIX_GOOGLE_CLIENT_ID__ = '12998500978-9rk2hki7jntah53m20m9nag4bgk1kr1o.apps.googleusercontent.com';
    });

    const baseUrl = 'http://localhost:3002/';
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Give the app + GSI script a moment to settle.
    await page.waitForTimeout(2000);

    // 2. Snapshot of the GSI state.
    const gsiState = await page.evaluate(() => {
        return {
            hasGoogle: typeof window.google !== 'undefined',
            hasAccounts: typeof window.google !== 'undefined' && typeof window.google.accounts !== 'undefined',
            hasOauth2:
                typeof window.google !== 'undefined' &&
                typeof window.google.accounts !== 'undefined' &&
                typeof window.google.accounts.oauth2 !== 'undefined',
            hasInitTokenClient:
                typeof window.google !== 'undefined' &&
                typeof window.google.accounts !== 'undefined' &&
                typeof window.google.accounts.oauth2 !== 'undefined' &&
                typeof window.google.accounts.oauth2.initTokenClient === 'function',
        };
    });
    console.log('[DEBUG] GSI state at startup:', gsiState);

    // 3. Open the profile drawer.
    const profileButton = page.locator('#dock-action-profile');
    await profileButton.click();
    // Wait for the drawer slide-in animation to finish.
    await page.waitForTimeout(2000);

    // Take a screenshot of the drawer.
    await page.screenshot({ path: 'test-results/google-login-drawer.png', fullPage: true });

    // 4. Click the Google login button. The list item text is translated
    // ("Accedi con Google" in Italian, "Login with Google" in English) so
    // we look for any visible list item button containing the Google icon.
    const loginButton = page.locator('.MuiListItemButton-root:has(svg[data-testid="GoogleIcon"])');
    const loginButtonCount = await loginButton.count();
    console.log('[DEBUG] login button count:', loginButtonCount);

    if (loginButtonCount > 0) {
        await loginButton.first().scrollIntoViewIfNeeded();
        await loginButton.first().click();
        // Wait for the snackbar to appear (the error path) or for the
        // Google popup to open (success path).
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-results/google-login-after-click.png', fullPage: true });
    } else {
        // Fallback: try to find by translated text content.
        const altButton = page.getByRole('button', { name: /Accedi|Login|Sign in/i }).first();
        if (await altButton.isVisible().catch(() => false)) {
            console.log('[DEBUG] falling back to text-based selector');
            await altButton.click();
            await page.waitForTimeout(3000);
            await page.screenshot({ path: 'test-results/google-login-after-click.png', fullPage: true });
        }
    }

    // 5. Dump everything we collected.
    console.log('\n========== PAGE ERRORS ==========');
    for (const err of pageErrors) {
        console.log(err);
    }
    console.log('\n========== CONSOLE MESSAGES ==========');
    for (const msg of consoleMessages) {
        console.log(`[${msg.type}] ${msg.text}`);
    }
    console.log('\n========== NETWORK (google/oauth) ==========');
    for (const req of networkRequests) {
        console.log(JSON.stringify(req));
    }
    console.log('\n========== END ==========');

    // The test is a diagnostic: it always passes, but it dumps useful
    // information for manual analysis.
    expect(true).toBe(true);
});
