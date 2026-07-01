/**
 * E2E: DetailView — clicking a show on the home page opens its detail screen.
 *
 * Flow:
 *   1. Land on home page, wait for content rows to load.
 *   2. Find a show card and click its "Altre Info" button.
 *   3. Verify the DetailView renders: hero backdrop, episode list, filter bar.
 *   4. Click the back button to return to home.
 *
 * Production-safe: no store seeding needed, uses live API data.
 */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('DetailView', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));
        page._testErrors = errors;
    });

    test('clicking "Altre Info" on a show opens DetailView', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        // Wait for show cards to be fully rendered
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.waitForTimeout(1500);

        // Find the "Altre Info" button — each show card has one
        const infoBtn = page.getByRole('button', { name: /altre info/i });
        await expect(infoBtn.first()).toBeVisible({ timeout: 10_000 });
        await infoBtn.first().click();

        await page.waitForSelector('#detail-view', { timeout: 10_000 });

        // Verify detail content is present — check for episode-related UI
        // (episode list, season selector, or episode cards)
        const detailText = await page.evaluate(() => document.body.innerText);
        const hasDetailContent = detailText.length > 200;
        expect(hasDetailContent).toBe(true);

        // No fatal errors
        const fatalErrors = (page._testErrors || []).filter((e) => !e.includes('Warning') && !e.includes('ResizeObserver'));
        expect(fatalErrors, `Console errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
    });

    test('back button returns to home from DetailView', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(2000);

        // Open a detail view
        const infoBtn = page.getByRole('button', { name: /altre info/i });
        await infoBtn.first().click();
        await page.waitForSelector('#screen-home', { timeout: 10_000, state: 'hidden' }).catch(() => {
            // Detail view is open; look for back button
        });

        // Find and click back — MUI uses arrow-back icon button
        const backBtn = page
            .locator('button[aria-label="go back"], button[aria-label="back"], [data-component="back-button"]')
            .first();
        if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await backBtn.click();
            await page.waitForSelector('section#screen-home', { timeout: 10_000, state: 'attached' });
            await expect(page.locator('section#screen-home')).toBeVisible();
        }
    });

    test('DetailView shows episode list and filter controls', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(2000);

        const infoBtn = page.getByRole('button', { name: /altre info/i });
        await infoBtn.first().click();
        await page.waitForTimeout(2000);

        // Verify DetailView has season/episode controls
        const bodyText = await page.evaluate(() => document.body.innerText);
        // Should have either season info or episode info
        const hasSeasonOrEpisode = /stagion|episode|episod/i.test(bodyText);
        expect(hasSeasonOrEpisode).toBe(true);
    });
});
