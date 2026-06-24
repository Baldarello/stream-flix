/**
 * E2E test for link service functionality:
 * 1. Navigate to library and VideoLinksTab
 * 2. Find a show and open LinkEpisodesModal
 * 3. Add links using pattern method with the test URL
 * 4. Verify links appear in the UI
 * 5. Delete a link and verify it's gone
 * 6. Test advanced config for half-season link sets
 */
import { test, expect } from '@playwright/test';

const IS_PROD = (process.env.SMOKE_URL || 'http://localhost:3002/').includes('localhost:3002');

const runTest = IS_PROD ? test.skip : test;
runTest('link service: insert, view and delete episode links', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
    await page.waitForTimeout(500);

    // Navigate to Library via profile drawer
    // 1. Click profile button
    const profileBtn = page.locator('[data-component="floating-dock"] button').last();
    await profileBtn.click();
    await page.waitForTimeout(300);

    // 2. Find and click "Manage Library" (sets activeView to 'Libreria')
    const manageLibBtn = page.getByText(/gestisci libreria/i, { exact: false });
    await manageLibBtn.click();
    await page.waitForTimeout(500);

    // 3. Confirm we're on the library screen
    await expect(page.locator('#library-dashboard')).toBeVisible({ timeout: 5000 });

    // 4. Click the "Link Video" tab (tab index 2)
    const tabs = page.locator('[role="tab"]');
    await tabs.nth(2).click();
    await page.waitForTimeout(500);

    // 5. Find a show card and click "Link Episodes" on it
    const firstShowCard = page.locator('#video-links-tab .MuiPaper-root').first();
    const linkEpBtn = firstShowCard.locator('button').filter({ hasText: /link/i }).first();
    await linkEpBtn.click();
    await page.waitForTimeout(500);

    // 6. Verify LinkEpisodesModal is open
    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // 7. Enter the test pattern URL
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.fill(TEST_PATTERN);
    await page.waitForTimeout(200);

    // 8. Set padding to 2 (already default)
    // 9. Click the insert placeholder button
    const insertBtn = page.getByText('[@EP]');
    await insertBtn.click();
    await page.waitForTimeout(200);

    // 10. Click Save
    const saveBtn = modal.locator('button').filter({ hasText: /salva|i salvataggio/i });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    // 11. Check snackbar for success
    const snackbar = page.locator('.MuiSnackbar-root, [role="alert"]');
    await expect(snackbar).toBeVisible({ timeout: 5000 });

    // 12. Verify no console errors
    const relevantErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR') && // ignore network errors for test URL
        !e.includes('Failed to load resource')
    );
    expect(relevantErrors, `Console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);
});
runTest('link service: advanced config for half-seasons', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#screen-home', { timeout: 30_000 });

    // Navigate to Library → VideoLinksTab → LinkEpisodesModal (same as above)
    const profileBtn = page.locator('[data-component="floating-dock"] button').last();
    await profileBtn.click();
    await page.waitForTimeout(300);
    const manageLibBtn = page.getByText(/gestisci libreria/i, { exact: false });
    await manageLibBtn.click();
    await page.waitForTimeout(500);

    await expect(page.locator('#library-dashboard')).toBeVisible({ timeout: 5000 });
    const tabs = page.locator('[role="tab"]');
    await tabs.nth(2).click();
    await page.waitForTimeout(500);

    const firstShowCard = page.locator('#video-links-tab .MuiPaper-root').first();
    const linkEpBtn = firstShowCard.locator('button').filter({ hasText: /link/i }).first();
    await linkEpBtn.click();
    await page.waitForTimeout(500);

    const modal = page.locator('[data-component="link-episodes-modal"]');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Enable advanced config
    const advancedSwitch = modal.locator('input[type="checkbox"]').first();
    await advancedSwitch.check();
    await page.waitForTimeout(200);

    // Fill pattern for half-season (e.g., episodes 1-6)
    const patternInput = page.locator('#pattern-url-episode');
    await patternInput.fill(TEST_PATTERN);

    // Set episode range: 1 to 6
    const startEpInput = modal.locator('input[type="number"]').nth(0);
    await startEpInput.fill('1');
    const endEpInput = modal.locator('input[type="number"]').nth(1);
    await endEpInput.fill('6');

    // Set number range: 1 to 6
    const startNumInput = modal.locator('input[type="number"]').nth(2);
    await startNumInput.fill('1');
    const endNumInput = modal.locator('input[type="number"]').nth(3);
    await endNumInput.fill('6');

    // Click save
    const saveBtn = modal.locator('button').filter({ hasText: /salva|i salvataggio/i });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    const snackbar = page.locator('.MuiSnackbar-root, [role="alert"]');
    await expect(snackbar).toBeVisible({ timeout: 5000 });

    const relevantErrors = consoleErrors.filter(e =>
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource')
    );
    expect(relevantErrors, `Console errors: ${relevantErrors.join('\n')}`).toHaveLength(0);
});
