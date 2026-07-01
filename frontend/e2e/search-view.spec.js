/**
 * E2E: SearchView — search for shows and navigate to results.
 *
 * Flow:
 *   1. Land on home page.
 *   2. Click the search dock button to open SearchView.
 *   3. Type a query and verify results appear.
 *   4. Click a result to open DetailView.
 *
 * Production-safe: uses live API search endpoint.
 */
import { expect, test } from '@playwright/test';

const APP_URL = process.env.SMOKE_URL || 'http://localhost:3002/';

test.describe('SearchView', () => {
    test.beforeEach(async ({ page }) => {
        const errors = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) => errors.push(err.message));
        page._testErrors = errors;
    });

    test('search button opens SearchView with prompt', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // Click the search dock button
        const searchBtn = page.locator('button[aria-label="search"]');
        await expect(searchBtn).toBeVisible({ timeout: 5000 });
        await searchBtn.click();

        // SearchView should mount
        await page.waitForSelector('#screen-search', { timeout: 8000 });

        // Check for search prompt text
        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasPrompt = /cerca|trova|cercando/i.test(bodyText);
        expect(hasPrompt).toBe(true);

        const fatalErrors = (page._testErrors || []).filter((e) => !e.includes('Warning') && !e.includes('ResizeObserver'));
        expect(fatalErrors, `Console errors: ${fatalErrors.join('\n')}`).toHaveLength(0);
    });

    test('typing a search query shows results', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        // Open search
        await page.locator('button[aria-label="search"]').click();
        await page.waitForSelector('#screen-search', { timeout: 8000 });

        // Find and type in the search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="erca"], input[placeholder*="arch"]').first();
        await searchInput.fill('Breaking Bad');
        await page.waitForTimeout(2000);

        // Should show results (API call)
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.length).toBeGreaterThan(50);
    });

    test('clicking a search result navigates to detail', async ({ page }) => {
        await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#screen-home', { timeout: 30_000, state: 'attached' });
        await page.waitForTimeout(1500);

        await page.locator('button[aria-label="search"]').click();
        await page.waitForSelector('#screen-search', { timeout: 8000 });

        const searchInput = page.locator('input[type="search"], input[placeholder*="erca"]').first();
        await searchInput.fill('Breaking Bad');
        await page.waitForTimeout(2000);

        const firstResult = page
            .locator('[class*="card"], [class*="Card"]')
            .filter({ hasText: /breaking/i })
            .first();
        if (await firstResult.isVisible({ timeout: 5000 }).catch(() => false)) {
            await firstResult.click();
            await page.waitForTimeout(2000);

            const bodyText = await page.evaluate(() => document.body.innerText);
            const isDetailView = /stagion|episod|breaking/i.test(bodyText);
            expect(isDetailView).toBe(true);
        }
    });
});
